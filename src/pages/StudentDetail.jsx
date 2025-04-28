import React from 'react';

function StudentDetail({ student }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-semibold text-white">{student.name}</h2>
      <p className="text-gray-400 mt-2">Email: <span className="text-white">{student.email}</span></p>
      <p className="text-gray-400 mt-2">Attendance Rate: <span className="text-white">{student.attendanceRate}%</span></p>
      
      <div className="mt-4">
        <h3 className="text-lg text-white">Enrolled Courses:</h3>
        <ul className="text-gray-400">
          {student.courses.map((course, index) => (
            <li key={index}>{course}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex justify-between">
        <button className="bg-pink-500 text-white px-4 py-2 rounded-lg">Edit Student</button>
        <button className="bg-red-500 text-white px-4 py-2 rounded-lg">Delete Student</button>
      </div>
    </div>
  );
}

export default StudentDetail;
