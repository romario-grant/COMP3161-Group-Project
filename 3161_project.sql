-- Database Creation

-- DROP DATABASE IF EXISTS course_mgmt;
CREATE DATABASE course_mgmt;
USE course_mgmt; 

-- Table Creation

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'lecturer', 'student') NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
); 

CREATE TABLE students (
    student_id INT PRIMARY KEY,
    FOREIGN KEY (student_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE lecturers (
    lecturer_id INT PRIMARY KEY,
    FOREIGN KEY (lecturer_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE admins (
    admin_id INT PRIMARY KEY,
    FOREIGN KEY (admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE courses (
    course_code VARCHAR(10) PRIMARY KEY NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    lecturer_id INT NOT NULL,  -- one lecturer
    course_description TEXT,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE RESTRICT
);

CREATE TABLE sections (
    section_id INT PRIMARY KEY AUTO_INCREMENT,
    course_code VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL, 
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
);

CREATE TABLE enrollments (
    enrollment_id INT PRIMARY KEY AUTO_INCREMENT,
    enrolled_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    student_id INT NOT NULL,
    course_code VARCHAR(10) NOT NULL,
    UNIQUE KEY (student_id, course_code),
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
);

CREATE TABLE calendar_event (
    event_id INT PRIMARY KEY AUTO_INCREMENT,
    course_code VARCHAR(10) NOT NULL,
    lecturer_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    event_type ENUM('lecture', 'tutorial', 'lab', 'exam') NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    description TEXT,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE RESTRICT
);

CREATE TABLE discussion_forum (
    forum_id INT PRIMARY KEY AUTO_INCREMENT,
    course_code VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
);

CREATE TABLE discussion_thread (
    thread_id INT PRIMARY KEY AUTO_INCREMENT,
    forum_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    initial_post TEXT NOT NULL, -- slight denormalization, posts being represented in both this table and the replies table, but it simplifies the initial post handling
    user_id INT NOT NULL,
    date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (forum_id) REFERENCES discussion_forum(forum_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE replies (
    reply_id INT PRIMARY KEY AUTO_INCREMENT,
    thread_id INT NOT NULL,
    parent_reply_id INT NULL,
    user_id INT NOT NULL,
    body TEXT NOT NULL,
    date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES discussion_thread(thread_id) ON DELETE CASCADE,
    FOREIGN KEY (parent_reply_id) REFERENCES replies(reply_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE course_content (
    content_id INT PRIMARY KEY AUTO_INCREMENT,
    course_code VARCHAR(10) NOT NULL, -- kept for easier content lookups/used in index definition, though section_id also references course_code
    section_id INT NOT NULL,
    lecturer_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content_type ENUM('link', 'file', 'slide', 'video') NOT NULL,
    content_url VARCHAR(255) NOT NULL,
    date_uploaded DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE RESTRICT
);

CREATE TABLE assignments (
    assignment_id INT PRIMARY KEY AUTO_INCREMENT,
    course_code VARCHAR(10) NOT NULL,
    title VARCHAR(255) NOT NULL,
    due_date DATETIME,
    total_marks DECIMAL(5,2) NOT NULL,
    description TEXT,
    FOREIGN KEY (course_code) REFERENCES courses(course_code) ON DELETE CASCADE
);

CREATE TABLE submissions (
    submission_id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    file_url VARCHAR(500) NULL, -- allowing text only submissions
    text_answer TEXT NULL, -- allowing file only submissions
    CONSTRAINT chk_submission_content CHECK (file_url IS NOT NULL OR text_answer IS NOT NULL),
    submission_status ENUM('submitted', 'late', 'missing', 'graded') NOT NULL,
    UNIQUE KEY (assignment_id, student_id),  -- one submission per student 
    FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE
);

CREATE TABLE grades (
    grade_id INT PRIMARY KEY AUTO_INCREMENT, 
    submission_id INT NOT NULL UNIQUE, 
    graded_by_lecturer_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(submission_id) ON DELETE CASCADE,
    FOREIGN KEY (graded_by_lecturer_id) REFERENCES lecturers(lecturer_id) ON DELETE RESTRICT
);

-- Indexes

-- For enrollment lookups
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_code);

-- For submission lookups
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);

-- For top-10-students view, avoids table scan on grades
CREATE INDEX idx_grades_submission ON grades(submission_id, score);

-- Courses, by lecturer, shown in lecturers_courses report view
CREATE INDEX idx_courses_lecturer ON courses(lecturer_id);

-- For forum and thread navigation
CREATE INDEX idx_threads_forum ON discussion_thread(forum_id);
CREATE INDEX idx_replies_thread ON replies(thread_id);
CREATE INDEX idx_replies_parent ON replies(parent_reply_id);
CREATE INDEX idx_forum_course ON discussion_forum(course_code);

-- For course content lookups
CREATE INDEX idx_content_course   ON course_content(course_code);
CREATE INDEX idx_content_section  ON course_content(section_id);
CREATE INDEX idx_sections_course ON sections(course_code, order_index);

-- Calendar events per course/student/lecturer
CREATE INDEX idx_calendar_course  ON calendar_event(course_code);
CREATE INDEX idx_calendar_course_date ON calendar_event(course_code, start_date);
CREATE INDEX idx_calendar_lecturer ON calendar_event(lecturer_id);

-- Reports

-- Courses with 50 or more students

CREATE VIEW courses_with_50 AS
SELECT 
    c.course_code,
    c.course_title,
    COUNT(e.student_id) AS student_count
FROM courses c
JOIN enrollments e ON c.course_code = e.course_code
GROUP BY c.course_code, c.course_title
HAVING COUNT(e.student_id) >= 50;

-- Students enrolled in 5 or more courses

CREATE VIEW students_overfive_courses AS
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    COUNT(e.course_code) AS course_count
FROM students s
JOIN users u ON s.student_id = u.user_id
JOIN enrollments e ON s.student_id = e.student_id
GROUP BY u.user_id, u.full_name, u.email
HAVING COUNT(e.course_code) >= 5;

-- Lecturers teaching 3 or more courses

CREATE VIEW lecturers_courses AS
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    COUNT(c.course_code) AS course_count
FROM lecturers l
JOIN users u ON l.lecturer_id = u.user_id
JOIN courses c ON l.lecturer_id = c.lecturer_id
GROUP BY u.user_id, u.full_name, u.email
HAVING COUNT(c.course_code) >= 3;

-- Top 10 most enrolled courses

CREATE VIEW most_enrolled_courses AS
SELECT 
    c.course_code,
    c.course_title,
    COUNT(e.student_id) AS enrollment_count
FROM courses c
JOIN enrollments e ON c.course_code = e.course_code
GROUP BY c.course_code, c.course_title
ORDER BY enrollment_count DESC
LIMIT 10;

-- Top 10 students with highest overall averages

CREATE VIEW top_10_students_by_average AS
SELECT 
    u.user_id,
    u.email,
    u.full_name,
    ROUND(AVG(g.score), 2) AS overall_average
FROM students s
JOIN users u ON s.student_id = u.user_id
JOIN submissions sub ON s.student_id = sub.student_id
JOIN grades g ON sub.submission_id = g.submission_id
GROUP BY u.user_id, u.full_name, u.email
ORDER BY overall_average DESC
LIMIT 10;

DROP USER IF EXISTS 'user_1'@'localhost';

CREATE USER 'user_1'@'localhost'
IDENTIFIED BY 'password876';

GRANT ALL PRIVILEGES ON course_mgmt.* TO 'user_1'@'localhost';

FLUSH PRIVILEGES;

SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM courses;
SELECT COUNT(*) FROM enrollments;
SELECT COUNT(*) FROM assignments;
SELECT COUNT(*) FROM users;