require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

console.log('Mongo URI exists:', !!process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection failed:');
  console.error(err);
});

mongoose.connection.on('error', err => {
  console.error('Mongoose runtime error:', err);
});

mongoose.connection.on('connected', () => {
  console.log('Mongoose connected event fired');
});

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  }
});

const TaskSchema = new mongoose.Schema({
  title: String,
  completed: Boolean,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  category: {
  type: String,
  default: 'General',
  trim: true
},
  dueDate: {
    type: Date,
    default: null
  },
  order: {
    type: Number,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const User = mongoose.model('User', UserSchema);
const Task = mongoose.model('Task', TaskSchema);

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded user:', decoded);

    req.user = {
      id: decoded.id || decoded.userId || decoded._id
    };

    console.log('Decoded user:', decoded);
    console.log('Req user:', req.user);

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.post('/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

  const token = jwt.sign(
  { id: user._id, username: user.username },
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

    res.json({
      token,
      username: user.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.get('/tasks', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({ order: 1 });
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error loading tasks' });
  }
});

app.post('/tasks', authMiddleware, async (req, res) => {
const task = new Task({
  title: req.body.title,
  completed: req.body.completed ?? false,
  priority: req.body.priority || 'medium',
  category: req.body.category || 'General',
  userId: req.user.id,
  dueDate: req.body.dueDate || null,
});

  await task.save();
  res.json(task);
});

app.delete('/tasks/:id', authMiddleware, async (req, res) => {
  await Task.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id
  });

  res.json({ message: 'Task deleted' });
});

app.put('/tasks/reorder', authMiddleware, async (req, res) => {
  try {
    const updates = req.body;

    const bulkOps = updates.map((task, index) => ({
      updateOne: {
        filter: {
          _id: task._id,
          userId: req.user.id
        },
        update: {
          $set: { order: index }
        }
      }
    }));

    await Task.bulkWrite(bulkOps);

    res.json({ message: 'Order updated' });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ message: 'Server error reordering tasks' });
  }
});

app.put('/tasks/:id', authMiddleware, async (req, res) => {
  const updatedTask = await Task.findOneAndUpdate(
    {
      _id: req.params.id,
      userId: req.user.id
    },
    req.body,
    { new: true }
  );

  res.json(updatedTask);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});