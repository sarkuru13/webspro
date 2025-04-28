import React from 'react';

function CourseDetail({ course }) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <h2 className="text-2xl font-semibold text-white">{course.name}</h2>
      <p className="text-gray-400 mt-2">{course.description}</p>
      <div className="mt-4">
        <p className="text-sm text-gray-500">Instructor: <span className="text-white">{course.instructor}</span></p>
        <p className="text-sm text-gray-500">Students Enrolled: <span className="text-white">{course.studentCount}</span></p>
      </div>
      <div className="mt-6 flex justify-between">
        <button className="bg-pink-500 text-white px-4 py-2 rounded-lg">Edit Course</button>
        <button className="bg-red-500 text-white px-4 py-2 rounded-lg">Delete Course</button>
      </div>
    </div>
  );
}

export default CourseDetail;
