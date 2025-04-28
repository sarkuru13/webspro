// Courses.jsx
import { useState } from 'react';

const Courses = () => {
  const [courses, setCourses] = useState([
    { id: 1, name: 'Course 1' },
    { id: 2, name: 'Course 2' },
  ]);

  const addCourse = (name) => {
    const newCourse = { id: courses.length + 1, name };
    setCourses([...courses, newCourse]);
  };

  const deleteCourse = (id) => {
    setCourses(courses.filter(course => course.id !== id));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-5">Courses</h1>
      <button
        onClick={() => addCourse(`Course ${courses.length + 1}`)}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-5"
      >
        Add Course
      </button>
      <ul>
        {courses.map(course => (
          <li key={course.id} className="flex justify-between mb-2">
            <span>{course.name}</span>
            <button
              onClick={() => deleteCourse(course.id)}
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

export default Courses;
