require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

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

const TaskSchema = new mongoose.Schema({
  title: String,
  completed: Boolean
});

const Task = mongoose.model('Task', TaskSchema);

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.get('/tasks', async (req, res) => {
  const tasks = await Task.find();
  res.json(tasks);
});

app.post('/tasks', async (req, res) => {
  const newTask = new Task(req.body);
  await newTask.save();
  res.json(newTask);
});

app.delete('/tasks/:id', async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: 'Task deleted' });
});

app.put('/tasks/:id', async (req, res) => {
  const updatedTask = await Task.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true }
  );
  res.json(updatedTask);
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});