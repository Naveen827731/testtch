import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Create an Express app
const app = express();
app.use(express.json());

// Configure environment variables
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/student-management';

// Connect to MongoDB
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// Define MongoDB models (Student and Task)
const Student = mongoose.model('Student', {
  name: String,
  email: String,
  department: String,
  password: String,
});

const Task = mongoose.model('Task', {
  studentId: mongoose.Schema.Types.ObjectId,
  name: String,
  dueDate: Date,
  status: String, // 'pending', 'overdue', 'completed'
});

// Authentication middleware
const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ message: 'Invalid token.' });
  }
};

// Admin login route
app.post('/admin/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@admin.com' && password === 'admin') {
    const token = jwt.sign({ role: 'admin' }, 'your-secret-key');
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials.' });
  }
});

// Add a new student
app.post('/admin/students/add', authenticate, async (req, res) => {
  const { name, email, department, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const student = new Student({ name, email, department, password: hashedPassword });
  try {
    await student.save();
    res.json({ message: 'Student added successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error adding student.' });
  }
});

// Assign a task to a student
app.post('/admin/tasks/assign', authenticate, async (req, res) => {
  const { studentId, name, dueDate } = req.body;
  const task = new Task({ studentId, name, dueDate, status: 'pending' });
  try {
    await task.save();
    res.json({ message: 'Task assigned successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning task.' });
  }
});

// Student login route
app.post('/student/login', async (req, res) => {
  const { email, password } = req.body;
  const student = await Student.findOne({ email });
  if (!student || !(await bcrypt.compare(password, student.password))) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  const token = jwt.sign({ role: 'student', studentId: student._id }, 'your-secret-key');
  res.json({ token });
});

// Fetch a student's tasks
app.get('/student/tasks', authenticate, async (req, res) => {
  const studentId = req.user.studentId;
  const tasks = await Task.find({ studentId });
  res.json({ tasks });
});

// Update task status
app.put('/student/tasks/:taskId/updateStatus', authenticate, async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.body;
  try {
    await Task.findByIdAndUpdate(taskId, { status });
    res.json({ message: 'Task status updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating task status.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
