// Students.jsx
import { useState } from 'react';

const Students = () => {
  const [students, setStudents] = useState([
    { id: 1, name: 'Student 1' },
    { id: 2, name: 'Student 2' },
  ]);

  const addStudent = (name) => {
    const newStudent = { id: students.length + 1, name };
    setStudents([...students, newStudent]);
  };

  const deleteStudent = (id) => {
    setStudents(students.filter(student => student.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5">Students</h1>
      <button
        onClick={() => addStudent(`Student ${students.length + 1}`)}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-5"
      >
        Add Student
      </button>
      <ul>
        {students.map(student => (
          <li key={student.id} className="flex justify-between mb-2">
            <span>{student.name}</span>
            <button
              onClick={() => deleteStudent(student.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Students;
