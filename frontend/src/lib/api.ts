export const API_BASE = import.meta.env.VITE_API_URL || "";

export type Course = {
  course_code: string;
  course_title: string;
  lecturer_id: number;
  course_description?: string;
};

export type User = {
  user_id: number;
  email: string;
  role: "admin" | "lecturer" | "student";
  full_name: string;
  created_at?: string;
};

export type LoginResponse = {
  message: string;
  user: User;
};

export type EventRow = {
  event_id?: number;
  course_code: string;
  lecturer_id: number;
  title: string;
  event_type: "lecture" | "tutorial" | "lab" | "exam";
  start_date: string;
  end_date: string;
  description?: string;
};

export type CourseContent = {
  content_id?: number;
  section_id?: number;
  course_code?: string;
  section_name: string;
  title: string | null;
  content_type: "link" | "file" | "slide" | "video" | null;
  content_url: string | null;
};

export type Forum = {
  forum_id: number;
  course_code: string;
  title: string;
  description?: string | null;
  date_created?: string;
};

export type Thread = {
  thread_id: number;
  forum_id: number;
  title: string;
  initial_post: string;
  user_id: number;
  created_by?: string;
  date_created?: string;
  reply_count?: number;
  replies?: Reply[];
};

export type Reply = {
  reply_id: number;
  thread_id: number;
  parent_reply_id?: number | null;
  user_id: number;
  body: string;
  date_created?: string;
  replies?: Reply[];
};

export type Assignment = {
  assignment_id: number;
  course_code: string;
  title: string;
  due_date?: string | null;
  total_marks: number;
  description?: string | null;
};

export type Submission = {
  submission_id: number;
  assignment_id: number;
  student_id: number;
  full_name?: string;
  assignment_title?: string;
  course_code?: string;
  submission_time?: string;
  file_url?: string | null;
  text_answer?: string | null;
  submission_status?: "submitted" | "late" | "missing" | "graded";
  grade_id?: number | null;
  score?: number | null;
  graded_by_lecturer_id?: number | null;
};

export type Report = {
  name: string;
  title: string;
  rows: Record<string, unknown>[];
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
    ...options,
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.error || `Request failed with ${response.status}`);
  }
  return payload as T;
}

export const api = {
  getCourses: () => request<Course[]>("/courses"),
  getStudentCourses: (studentId: string) =>
    request<{ student_id: number; courses: { course_code: string }[] }>(`/enrollments/${studentId}`),
  getLecturerCourses: (lecturerId: string) =>
    request<{ lecturer_id: number; courses: Pick<Course, "course_code" | "course_title">[] }>(`/courses/${lecturerId}`),
  getMembers: (courseCode: string) =>
    request<{ course_code: string; students: { student_id: number; full_name: string }[] }>(`/enrollments/${courseCode}`),
  getCourseEvents: (courseCode: string) => request<{ events: EventRow[] }>(`/calendar/course/${courseCode}`),
  getStudentDailyEvents: (studentId: number, date: string) =>
    request<{ events: EventRow[] }>(`/calendar/student/${studentId}/${date}`),
  getCourseContent: (courseCode: string) =>
    request<{ course_code: string; content: CourseContent[] }>(`/courses/${courseCode}/content`),
  getCourseAssignments: (courseCode: string) =>
    request<{ course_code: string; assignments: Assignment[] }>(`/courses/${courseCode}/assignments`),
  getStudentSubmissions: (studentId: number) =>
    request<{ student_id: number; submissions: Submission[] }>(`/students/${studentId}/submissions`),
  getAssignmentSubmissions: (assignmentId: number) =>
    request<{ assignment_id: number; submissions: Submission[] }>(`/assignments/${assignmentId}/submissions`),
  getCourseForums: (courseCode: string) =>
    request<{ course_code: string; forums: Forum[] }>(`/courses/${courseCode}/forums`),
  getForumThreads: (forumId: number) =>
    request<{ forum_id: number; threads: Thread[] }>(`/forums/${forumId}/threads`),
  getThread: (threadId: number) => request<Thread>(`/threads/${threadId}`),
  getReports: () => request<{ reports: Report[] }>("/reports"),
  getReport: (reportName: string) => request<Report>(`/reports/${reportName}`),
  createEvent: (event: EventRow) =>
    request<{ message: string }>("/calendar/create", { method: "POST", body: JSON.stringify(event) }),
  registerForCourse: (enrollment: { student_id: number; course_code: string }) =>
    request<{ message: string }>("/register_for_course", { method: "POST", body: JSON.stringify(enrollment) }),
  createCourse: (course: Course & { user_id: number }) =>
    request<{ message: string }>("/create_course", { method: "POST", body: JSON.stringify(course) }),
  uploadContent: (content: {
    course_code: string;
    section_id: number;
    lecturer_id: number;
    title: string;
    content_type: string;
    content_url: string;
  }) => request<{ message: string }>("/courses/content/upload", { method: "POST", body: JSON.stringify(content) }),
  createForum: (forum: { course_code: string; title: string; description?: string }) =>
    request<{ message: string; forum_id: number }>("/create_forum", { method: "POST", body: JSON.stringify(forum) }),
  createThread: (thread: { forum_id: number; title: string; initial_post: string; user_id: number }) =>
    request<{ message: string; thread_id: number }>("/create_thread", { method: "POST", body: JSON.stringify(thread) }),
  addReply: (threadId: number, reply: { user_id: number; body: string; parent_reply_id?: number | null }) =>
    request<{ message: string; reply_id: number }>(`/threads/${threadId}/replies`, {
      method: "POST",
      body: JSON.stringify(reply),
    }),
  submitAssignment: (
    assignmentId: number,
    submission: { student_id: number; file_url?: string | null; text_answer?: string | null }
  ) =>
    request<{ message: string; submission_id: number; submission_status: Submission["submission_status"] }>(
      `/assignments/${assignmentId}/submit`,
      { method: "POST", body: JSON.stringify(submission) }
    ),
  gradeSubmission: (submissionId: number, grade: { lecturer_id: number; score: number }) =>
    request<{ message: string }>(`/submissions/${submissionId}/grade`, { method: "POST", body: JSON.stringify(grade) }),
  login: (credentials: { email: string; password_hash: string }) =>
    request<LoginResponse>("/login", { method: "POST", body: JSON.stringify(credentials) }),
  createUser: (user: User & { password_hash: string }) =>
    request<{ message: string }>("/register_user", { method: "POST", body: JSON.stringify(user) }),
};

