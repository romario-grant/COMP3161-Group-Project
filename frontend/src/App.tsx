import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Layers3,
  Link as LinkIcon,
  Loader2,
  MessageSquareText,
  Plus,
  Presentation,
  Search,
  Send,
  Users,
  Video,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import Badge from "./components/Badge";
import MotionCard from "./components/MotionCard";
import Navbar from "./components/Navbar";
import {
  api,
  demoContent,
  demoCourses,
  demoEvents,
  type Course,
  type CourseContent,
  type EventRow,
} from "./lib/api";

type LoadState = "idle" | "loading" | "ready" | "error";

const apiGaps = [
  "Real credential login",
  "Create and list forums",
  "List threads for a forum",
  "Post replies",
  "Submit assignments",
  "Submit grades",
  "Expose report views",
];

function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: string;
}) {
  return (
    <motion.div
      className="page-header"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{children}</p>
    </motion.div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  children: string;
}) {
  return (
    <MotionCard hover={false} className="empty-state">
      <Icon size={38} />
      <h3>{title}</h3>
      <p>{children}</p>
    </MotionCard>
  );
}

function App() {
  const [active, setActive] = useState("dashboard");
  const [dark, setDark] = useState(true);
  const [courses, setCourses] = useState<Course[]>(demoCourses);
  const [events, setEvents] = useState<EventRow[]>(demoEvents);
  const [content, setContent] = useState<CourseContent[]>(demoContent);
  const [selectedCourse, setSelectedCourse] = useState("COMP4187");
  const [status, setStatus] = useState<LoadState>("idle");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    document.documentElement.classList.toggle("light", !dark);
  }, [dark]);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    Promise.allSettled([
      api.getCourses(),
      api.getCourseEvents(selectedCourse),
      api.getCourseContent(selectedCourse),
    ]).then(([courseResult, eventResult, contentResult]) => {
      if (cancelled) return;
      if (courseResult.status === "fulfilled" && courseResult.value.length) {
        setCourses(courseResult.value);
      }
      if (eventResult.status === "fulfilled") {
        setEvents(eventResult.value.events);
      }
      if (contentResult.status === "fulfilled") {
        setContent(contentResult.value.content.filter((row) => row.title));
      }
      const failed = [courseResult, eventResult, contentResult].some((item) => item.status === "rejected");
      setApiError(failed ? "Some data is using demo values because the Flask API or database is not reachable." : "");
      setStatus(failed ? "error" : "ready");
    });
    return () => {
      cancelled = true;
    };
  }, [selectedCourse]);

  const stats = useMemo(
    () => [
      { label: "Courses Loaded", value: courses.length, icon: BookOpen, tone: "blue" },
      { label: "Demo Student", value: "61", icon: GraduationCap, tone: "safe" },
      { label: "Selected Course", value: selectedCourse, icon: Layers3, tone: "info" },
      { label: "Open API Tasks", value: apiGaps.length, icon: AlertTriangle, tone: "warn" },
    ],
    [courses.length, selectedCourse]
  );

  return (
    <div className="app-shell">
      <Navbar active={active} setActive={setActive} dark={dark} toggleDark={() => setDark((value) => !value)} />
      <main className="app-main">
        {apiError && (
          <div className="api-warning">
            <AlertTriangle size={16} />
            {apiError}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.section
            key={active}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {active === "dashboard" && (
              <Dashboard
                stats={stats}
                courses={courses}
                events={events}
                content={content}
                setActive={setActive}
                status={status}
              />
            )}
            {active === "courses" && (
              <Courses courses={courses} selectedCourse={selectedCourse} setSelectedCourse={setSelectedCourse} />
            )}
            {active === "calendar" && <Calendar events={events} selectedCourse={selectedCourse} />}
            {active === "forums" && <Forums />}
            {active === "content" && <Content content={content} selectedCourse={selectedCourse} />}
            {active === "assignments" && <Assignments />}
            {active === "reports" && <Reports />}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}

function Dashboard({
  stats,
  courses,
  events,
  content,
  setActive,
  status,
}: {
  stats: { label: string; value: string | number; icon: typeof BookOpen; tone: string }[];
  courses: Course[];
  events: EventRow[];
  content: CourseContent[];
  setActive: (page: string) => void;
  status: LoadState;
}) {
  const quickActions = [
    { page: "courses", label: "Browse Courses", icon: BookOpen },
    { page: "calendar", label: "Plan Events", icon: CalendarDays },
    { page: "content", label: "View Content", icon: FileText },
    { page: "reports", label: "Check Reports", icon: BarChart3 },
  ];

  return (
    <>
      <section className="hero-panel">
        <div className="hero-photo" />
        <div className="hero-content">
          <Badge variant="info">COMP3161 LMS</Badge>
          <h1>Course management, shaped like a real dashboard.</h1>
          <p>
            A StatementSense-inspired interface for courses, enrollments, calendar events, content, forums,
            assignments, and reports.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => setActive("courses")}>
              <BookOpen size={16} />
              Explore Courses
            </button>
            <button className="secondary-button" onClick={() => setActive("reports")}>
              <BarChart3 size={16} />
              Review Gaps
            </button>
          </div>
        </div>
      </section>

      <div className="stats-grid">
        {stats.map(({ label, value, icon: Icon, tone }, index) => (
          <MotionCard key={label} delay={index * 0.05} hover={false} className="stat-card">
            <div className={`stat-icon ${tone}`}>
              <Icon size={18} />
            </div>
            <p>{label}</p>
            <strong>{value}</strong>
          </MotionCard>
        ))}
      </div>

      <div className="dashboard-grid">
        <MotionCard hover={false} className="wide-card">
          <div className="section-title">
            <div>
              <h2>Current Course Activity</h2>
              <p>{status === "loading" ? "Connecting to Flask API..." : "Live where possible, demo-backed where needed."}</p>
            </div>
            {status === "loading" && <Loader2 className="spin" size={18} />}
          </div>
          <div className="course-list compact">
            {courses.slice(0, 4).map((course) => (
              <div className="course-row" key={course.course_code}>
                <div>
                  <Badge variant="blue">{course.course_code}</Badge>
                  <h3>{course.course_title}</h3>
                  <p>{course.course_description || "No description available."}</p>
                </div>
                <span>Lecturer {course.lecturer_id}</span>
              </div>
            ))}
          </div>
        </MotionCard>

        <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Quick Actions</h2>
              <p>Presentation-friendly shortcuts.</p>
            </div>
          </div>
          <div className="quick-list">
            {quickActions.map(({ page, label, icon: Icon }) => (
              <button key={page} onClick={() => setActive(page)}>
                <Icon size={16} />
                {label}
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </MotionCard>

        <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Upcoming Events</h2>
              <p>Course calendar snapshot.</p>
            </div>
          </div>
          <div className="mini-list">
            {events.slice(0, 3).map((event) => (
              <div key={`${event.title}-${event.start_date}`}>
                <Badge variant={event.event_type === "exam" ? "danger" : "info"}>{event.event_type}</Badge>
                <p>{event.title}</p>
                <span>{event.start_date}</span>
              </div>
            ))}
          </div>
        </MotionCard>

        <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Recent Content</h2>
              <p>Materials grouped by section.</p>
            </div>
          </div>
          <div className="mini-list">
            {content.slice(0, 3).map((item) => (
              <div key={`${item.section_name}-${item.title}`}>
                <Badge variant="safe">{item.content_type || "item"}</Badge>
                <p>{item.title}</p>
                <span>{item.section_name}</span>
              </div>
            ))}
          </div>
        </MotionCard>
      </div>
    </>
  );
}

function Courses({
  courses,
  selectedCourse,
  setSelectedCourse,
}: {
  courses: Course[];
  selectedCourse: string;
  setSelectedCourse: (course: string) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = courses.filter((course) =>
    `${course.course_code} ${course.course_title}`.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <>
      <PageHeader eyebrow="Courses" title="Course Catalog">
        Browse all courses, select a working course context, and prepare enrollment/member workflows.
      </PageHeader>
      <div className="toolbar">
        <div className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search course code or title" />
        </div>
        <button className="primary-button">
          <Plus size={16} />
          Create Course
        </button>
      </div>
      <div className="course-list">
        {filtered.map((course, index) => (
          <MotionCard key={course.course_code} delay={index * 0.03} className="course-card">
            <div>
              <Badge variant={selectedCourse === course.course_code ? "safe" : "blue"}>{course.course_code}</Badge>
              <h2>{course.course_title}</h2>
              <p>{course.course_description || "No description available."}</p>
            </div>
            <div className="card-footer">
              <span>Lecturer {course.lecturer_id}</span>
              <button className="secondary-button" onClick={() => setSelectedCourse(course.course_code)}>
                Use Course
              </button>
            </div>
          </MotionCard>
        ))}
      </div>
    </>
  );
}

function Calendar({ events, selectedCourse }: { events: EventRow[]; selectedCourse: string }) {
  return (
    <>
      <PageHeader eyebrow="Calendar" title="Course Events">
        Create and review lectures, tutorials, labs, and exams for the selected course.
      </PageHeader>
      <div className="split-grid">
        <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Create Event</h2>
              <p>Connected endpoint: POST /calendar/create</p>
            </div>
          </div>
          <form className="form-stack">
            <label>
              Course Code
              <input value={selectedCourse} readOnly />
            </label>
            <label>
              Title
              <input placeholder="Midterm Exam" />
            </label>
            <label>
              Event Type
              <select defaultValue="lecture">
                <option value="lecture">Lecture</option>
                <option value="tutorial">Tutorial</option>
                <option value="lab">Lab</option>
                <option value="exam">Exam</option>
              </select>
            </label>
            <button type="button" className="primary-button">
              <CalendarDays size={16} />
              Save Event
            </button>
          </form>
        </MotionCard>
        <MotionCard hover={false} className="wide-card">
          <div className="section-title">
            <div>
              <h2>{selectedCourse} Timeline</h2>
              <p>Connected endpoint: GET /calendar/course/{selectedCourse}</p>
            </div>
          </div>
          <div className="timeline">
            {events.map((event, index) => (
              <div className="timeline-row" key={`${event.title}-${index}`}>
                <span />
                <div>
                  <Badge variant={event.event_type === "exam" ? "danger" : "info"}>{event.event_type}</Badge>
                  <h3>{event.title}</h3>
                  <p>{event.description || "No description provided."}</p>
                  <small>
                    {event.start_date} to {event.end_date}
                  </small>
                </div>
              </div>
            ))}
          </div>
        </MotionCard>
      </div>
    </>
  );
}

function Forums() {
  const threads = [
    {
      title: "Question about the assignment",
      author: "Student 61",
      replies: 6,
      body: "Can someone clarify the next assignment requirements?",
    },
    {
      title: "Lab review resources",
      author: "Lecturer 45",
      replies: 13,
      body: "Posting the key resources ahead of the practical review.",
    },
  ];

  return (
    <>
      <PageHeader eyebrow="Forums" title="Forum and Discussion Threads">
        Discussion UI is ready, but the API still needs create/list forum, list threads, and reply endpoints.
      </PageHeader>
      <div className="api-gap-banner">
        <AlertTriangle size={18} />
        Waiting on API: create forum, list forums for a course, list threads for a forum, add replies.
      </div>
      <div className="split-grid">
        <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Course Forums</h2>
              <p>Planned endpoint: GET /courses/:course/forums</p>
            </div>
          </div>
          <div className="quick-list">
            <button>
              <MessageSquareText size={16} />
              COMP4187 Discussion Forum
              <Badge variant="info">demo</Badge>
            </button>
            <button>
              <MessageSquareText size={16} />
              INFO2220 Discussion Forum
              <Badge variant="info">demo</Badge>
            </button>
          </div>
        </MotionCard>
        <MotionCard hover={false} className="wide-card">
          <div className="section-title">
            <div>
              <h2>Threads</h2>
              <p>Existing endpoint can retrieve one thread by ID.</p>
            </div>
          </div>
          <div className="thread-list">
            {threads.map((thread) => (
              <div key={thread.title} className="thread-card">
                <div>
                  <h3>{thread.title}</h3>
                  <p>{thread.body}</p>
                  <span>{thread.author}</span>
                </div>
                <Badge variant="blue">{thread.replies} replies</Badge>
              </div>
            ))}
          </div>
          <div className="reply-box">
            <input placeholder="Reply endpoint pending..." disabled />
            <button className="icon-button" disabled>
              <Send size={16} />
            </button>
          </div>
        </MotionCard>
      </div>
    </>
  );
}

function Content({ content, selectedCourse }: { content: CourseContent[]; selectedCourse: string }) {
  const iconFor = (type: CourseContent["content_type"]) => {
    if (type === "slide") return Presentation;
    if (type === "video") return Video;
    if (type === "file") return FileText;
    return LinkIcon;
  };

  return (
    <>
      <PageHeader eyebrow="Course Content" title="Section Materials">
        Lecturers can upload links, files, slides, and videos by section.
      </PageHeader>
      <div className="split-grid">
        <MotionCard hover={false}>
          <div className="section-title">
            <div>
              <h2>Upload Content</h2>
              <p>Connected endpoint: POST /courses/content/upload</p>
            </div>
          </div>
          <form className="form-stack">
            <label>
              Course Code
              <input value={selectedCourse} readOnly />
            </label>
            <label>
              Section ID
              <input defaultValue="1" />
            </label>
            <label>
              Content Type
              <select defaultValue="slide">
                <option value="link">Link</option>
                <option value="file">File</option>
                <option value="slide">Slide</option>
                <option value="video">Video</option>
              </select>
            </label>
            <button type="button" className="primary-button">
              <Plus size={16} />
              Upload
            </button>
          </form>
        </MotionCard>
        <MotionCard hover={false} className="wide-card">
          <div className="section-title">
            <div>
              <h2>{selectedCourse} Materials</h2>
              <p>Connected endpoint: GET /courses/{selectedCourse}/content</p>
            </div>
          </div>
          <div className="content-grid">
            {content.length ? (
              content.map((item, index) => {
                const Icon = iconFor(item.content_type);
                return (
                  <div className="content-item" key={`${item.title}-${index}`}>
                    <Icon size={18} />
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.section_name}</p>
                    </div>
                    <Badge variant="info">{item.content_type || "item"}</Badge>
                  </div>
                );
              })
            ) : (
              <EmptyState icon={FileText} title="No content yet">
                Once the database is loaded, section content appears here.
              </EmptyState>
            )}
          </div>
        </MotionCard>
      </div>
    </>
  );
}

function Assignments() {
  return (
    <>
      <PageHeader eyebrow="Assignments" title="Submissions and Grades">
        The schema is ready for assignments, submissions, and grades. The API endpoints are still pending.
      </PageHeader>
      <div className="api-gap-banner">
        <AlertTriangle size={18} />
        Waiting on API: submit assignment, view submissions, submit grade, retrieve grades.
      </div>
      <div className="dashboard-grid">
        {[
          ["Assignment 1", "Database normalization write-up", "Due Apr 12", "submitted"],
          ["Assignment 2", "Course API implementation", "Due Apr 26", "pending"],
          ["Final Project", "Presentation and demo", "Due May 08", "graded"],
        ].map(([title, body, due, state], index) => (
          <MotionCard key={title} delay={index * 0.05} hover={false}>
            <div className="assignment-card">
              <Badge variant={state === "graded" ? "safe" : state === "pending" ? "warn" : "blue"}>{state}</Badge>
              <h2>{title}</h2>
              <p>{body}</p>
              <span>{due}</span>
            </div>
          </MotionCard>
        ))}
      </div>
    </>
  );
}

function Reports() {
  const reports = [
    ["Courses with 50+ Students", "courses_with_50", "Tracks high-enrollment courses."],
    ["Students with 5+ Courses", "students_overfive_courses", "Finds heavily loaded students."],
    ["Lecturers with 3+ Courses", "lecturers_courses", "Shows heavy lecturer course assignments."],
    ["Top 10 Enrolled Courses", "most_enrolled_courses", "Ranks courses by enrollment count."],
    ["Top 10 Student Averages", "top_10_students_by_average", "Ranks students by overall grade average."],
  ];

  return (
    <>
      <PageHeader eyebrow="Reports" title="SQL View Dashboard">
        Required report views exist in SQL. The frontend is ready for API routes to expose them.
      </PageHeader>
      <div className="api-gap-banner success">
        <CheckCircle2 size={18} />
        SQL views exist. Flask report endpoints still need to be added for live data.
      </div>
      <div className="report-grid">
        {reports.map(([title, view, description], index) => (
          <MotionCard key={view} delay={index * 0.04} hover={false} className="report-card">
            <BarChart3 size={22} />
            <h2>{title}</h2>
            <p>{description}</p>
            <code>{view}</code>
          </MotionCard>
        ))}
      </div>
    </>
  );
}

export default App;
