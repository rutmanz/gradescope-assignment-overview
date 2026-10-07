import React, { type ReactElement } from "react";
import uniqolor from "uniqolor";




export const MainView: React.FunctionComponent = ({ }) => {
    return <div>
        <h1>Assignments</h1>
        <p>This is a simple aggregator for Gradescope assignments.</p>
        <AssignmentsTable />
    </div>
}

type SortColumn = "course" | "name" | "status" | "due"

const states = {
    "Graded": (element: Element) => element.querySelector(".submissionStatus--score") != null,
    "Submitted": (element: Element) => element.querySelector(".submissionStatus--text")?.textContent == "Submitted",
    "Not Submitted": (element: Element) => element.querySelector(".submissionStatus--text")?.textContent == "No Submission",
} as const satisfies Record<string, (element: Element) => boolean>
type State = keyof typeof states



const statePriority: Record<State, number> = {
    "Graded": 2,
    "Submitted": 1,
    "Not Submitted": 0,
}

const sortAlgorithms:Record<SortColumn, (a: Element, b: Element) => number> = {
    "course": (a: Element, b: Element) => {
        const aCourse = a.querySelector(".courseLink")?.textContent || "";
        const bCourse = b.querySelector(".courseLink")?.textContent || "";
        return aCourse.localeCompare(bCourse);
    },
    "name": (a: Element, b: Element) => {
        const aName = a.querySelector("th a")?.textContent || "";
        const bName = b.querySelector("th a")?.textContent || "";
        return aName.localeCompare(bName);
    },
    "status": (a: Element, b: Element) => {
        const aStatus = Object.keys(states).find((state) => states[state as State](a)) || "";
        const bStatus = Object.keys(states).find((state) => states[state as State](b)) || "";
        return statePriority[aStatus as State] - statePriority[bStatus as State];
    },
    "due": (a: Element, b: Element) => {
        const aDue = new Date(a.querySelector(".submissionTimeChart--dueDate")?.getAttribute("datetime") || "");
        const bDue = new Date(b.querySelector(".submissionTimeChart--dueDate")?.getAttribute("datetime") || "");
        return aDue.getTime() - bDue.getTime();
    }
}


const AssignmentsTable: React.FunctionComponent = () => {
    const courses = document.querySelectorAll("a.courseBox")
    const [header, setHeader] = useState<ReactElement | null>(null);
    const [assignments, setAssignments] = useState<Element[]>([]);
    const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
    const [sortAscending, setSortAscending] = useState<boolean>(false);

    const getSortClass = useCallback((column: SortColumn) => {
        if (sortColumn === column) {
            return sortAscending ? "sorting sorting_asc" : "sorting sorting_desc"
        }
        return "sorting"
    }, [sortColumn, sortAscending])

    const onSortClicked = useCallback((column: SortColumn) => {
        let ascending = false;
        if (sortColumn === column) {
            ascending = !sortAscending;
        } else {
            setSortColumn(column)
        }
        setSortAscending(ascending)
        setAssignments((assignments) => assignments.toSorted((a,b) => !ascending ? sortAlgorithms[column](a, b) : sortAlgorithms[column](b, a)))
    }, [sortColumn, sortAscending])

    const updateAssignments = useCallback(async () => {
        const courseTables = await Promise.all([...courses].map(async (course) => {
            const link = course.getAttribute("href");
            const title = course.querySelector(".courseBox--shortname")?.textContent;
            console.log("Loading course", title, link);
            if (link == null || title == null) return;
            const href = new URL(link, document.baseURI).href;
            const page = await fetch(href)
            const parser = new DOMParser();
            const doc = parser.parseFromString(await page.text(), "text/html");
            const assignments = doc.querySelector("#assignments-student-table");
            if (assignments == null) {
                return
            }
            setHeader(header => {
                if (header != null) { return header }
                const h = assignments.querySelector("thead");
                if (h == null) { return null }
                const newTitle = document.createElement("th");
                newTitle.textContent = "Course";
                newTitle.colSpan = 1;

                h.firstChild?.insertBefore(newTitle, h.firstChild.firstChild);

                for (const el of h.children[0]?.children || []) {
                    if (el instanceof HTMLTableCellElement) {
                        el.classList.add("sorting");
                    }
                }
                return reactify(h!, "header")
            }
            );
            assignments?.querySelectorAll("td.hidden-column").forEach((el) => el.remove());

            return { course: title, courseLink: href, courseColor: uniqolor(href), assignments: [...assignments!.querySelectorAll("tbody > tr")] }
        })).then((r) => r.filter((r) => r !== undefined))

        setAssignments(courseTables.flatMap((course, i) => {
            return course.assignments.map((assignment, j) => {
                const courseElement = document.createElement("td");
                const courseLink = document.createElement("a");
                courseLink.href = course.courseLink;
                courseLink.textContent = course.course;
                courseElement.append(courseLink);
                courseLink.style.backgroundColor = course.courseColor.color;
                courseLink.style.color = course.courseColor.isLight ? "black" : "white";
                courseLink.className = "courseLink";
                assignment.insertBefore(courseElement, assignment.firstChild)
                assignment.id = `assignment-${i}-${j}`
                return assignment;
            })
        }))
    }, [])

    useEffect(() => {
        updateAssignments();
    }, [updateAssignments]);


    return <table style={{ borderSpacing: "5px" }} id="assignments-student-table">
        <thead>
            <tr role="row">
                <TableHeader column="course" label="Course" onSortClicked={onSortClicked} sortClasses={getSortClass("course")} />
                <TableHeader column="name" label="Name" onSortClicked={onSortClicked} sortClasses={getSortClass("name")} />
                <TableHeader column="status" label="Status" onSortClicked={onSortClicked} sortClasses={getSortClass("status")} />

                <th className={`table--complexHeader sorting-right ${getSortClass("due")}`} role="columnheader" scope="col" onClick={() => onSortClicked("due")}>
                    <div aria-label="Due Date">
                        <span aria-hidden="true" className="table--cell-hiddenOnMobile">Released</span>
                        <span>Due</span>
                    </div>
                </th>
            </tr>
        </thead>
        {/* {header ?? <thead></thead>} */}
        <tbody>
            {assignments.map((assignment, i) => {
                return reactify(assignment, assignment.id)
            })}
        </tbody>
    </table>
}


const TableHeader: React.FunctionComponent<{ column: SortColumn, label: string, onSortClicked: (column: SortColumn) => void, sortClasses:string }> = ({ column, label, onSortClicked, sortClasses }) => {
    return <th role="columnheader" scope="col" className={sortClasses} tabIndex={0} aria-controls="assignments-student-table" rowSpan={1} colSpan={1} onClick={() => onSortClicked(column)}>{label}</th>
}


function reactify(element: Element, key: string): React.ReactElement {
    return React.createElement(element.tagName.toLowerCase(), { key, dangerouslySetInnerHTML: { __html: element.innerHTML } });
}

