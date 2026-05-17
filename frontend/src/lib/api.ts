export const API_BASE = import.meta.env.VITE_API_URL || "/api";

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
  section_name: string;
  title: string | null;
  content_type: "link" | "file" | "slide" | "video" | null;
  content_url: string | null;
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
  getCourseContent: (courseCode: string) =>
    request<{ course_code: string; content: CourseContent[] }>(`/courses/${courseCode}/content`),
  createEvent: (event: EventRow) =>
    request<{ message: string }>("/calendar/create", { method: "POST", body: JSON.stringify(event) }),
  uploadContent: (content: {
    course_code: string;
    section_id: number;
    lecturer_id: number;
    title: string;
    content_type: string;
    content_url: string;
  }) => request<{ message: string }>("/courses/content/upload", { method: "POST", body: JSON.stringify(content) }),
  createUser: (user: User & { password_hash: string }) =>
    request<{ message: string }>("/register_user", { method: "POST", body: JSON.stringify(user) }),
};

export const demoCourses: Course[] = [
  {
    course_code: "COMP4187",
    course_title: "Site Line Design",
    lecturer_id: 45,
    course_description: "Design-oriented course management demo data from the generated SQL set.",
  },
  {
    course_code: "INFO2220",
    course_title: "Act Man Design",
    lecturer_id: 22,
    course_description: "Information systems course with content, calendar, and forum activity.",
  },
  {
    course_code: "STAT2500",
    course_title: "Yet Relate Design",
    lecturer_id: 1,
    course_description: "Statistics course used to demonstrate reports and enrollment density.",
  },
];

export const demoEvents: EventRow[] = [
  {
    course_code: "COMP4187",
    lecturer_id: 45,
    title: "Midterm Exam",
    event_type: "exam",
    start_date: "2026-03-20 09:00:00",
    end_date: "2026-03-20 11:00:00",
    description: "Course assessment window.",
  },
  {
    course_code: "COMP4187",
    lecturer_id: 45,
    title: "Lab Review",
    event_type: "lab",
    start_date: "2026-03-28 13:00:00",
    end_date: "2026-03-28 15:00:00",
    description: "Guided practical review for enrolled students.",
  },
];

export const demoContent: CourseContent[] = [
  {
    section_name: "Section 1: Such five activity owner",
    title: "Week 1 Lecture Slides",
    content_type: "slide",
    content_url: "https://lms.example.edu/content/week-1-slides",
  },
  {
    section_name: "Section 2: Church inside",
    title: "Course Reading Pack",
    content_type: "file",
    content_url: "https://lms.example.edu/content/reading-pack",
  },
];
