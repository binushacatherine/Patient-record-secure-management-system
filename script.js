const accounts = [
    { username: "doctor1", password: "Doc123", role: "doctor" },
    { username: "reception1", password: "Rec123", role: "receptionist" },
    { username: "admin", password: "Admin123", role: "admin" }
];

let currentUser = null;
let patients = [];
let auditLogs = [];
let nextPatientId = 1001;

const $ = id => document.getElementById(id);

function setVisible(id, visible) {
    $(id).classList.toggle("hidden", !visible);
}

function logActivity(action, details) {
    auditLogs.unshift({
        time: new Date().toLocaleString(),
        username: currentUser ? currentUser.username : "Unknown",
        role: currentUser ? currentUser.role : "Unauthenticated",
        action,
        details
    });

    $("activityCount").textContent = auditLogs.length;
}

$("fillDemo").addEventListener("click", () => {
    const account = accounts.find(a => a.role === $("role").value);
    $("username").value = account.username;
    $("password").value = account.password;
    $("loginMessage").textContent = "";
});

$("loginForm").addEventListener("submit", event => {
    event.preventDefault();

    const username = $("username").value.trim();
    const password = $("password").value;
    const role = $("role").value;

    const account = accounts.find(a =>
        a.username === username &&
        a.password === password &&
        a.role === role
    );

    if (!account) {
        logActivity("LOGIN DENIED", "Invalid credentials or role");
        $("loginMessage").textContent =
            "Access denied. Check your username, password and role.";
        return;
    }

    currentUser = {
        username: account.username,
        role: account.role
    };

    logActivity("LOGIN SUCCESS", "Authorized demo login");

    $("welcomeText").textContent = "Welcome, " + currentUser.username;
    $("roleText").textContent =
        "Access role: " + currentUser.role.toUpperCase();

    setVisible("loginSection", false);
    setVisible("dashboard", true);

    setVisible("registerSection", currentUser.role === "receptionist");
    setVisible("recordSection", true);
    setVisible("logSection", currentUser.role === "admin");

    if (currentUser.role === "doctor") {
        $("recordPermission").textContent =
            "Clinical records and medical notes are available to doctors.";
    } else if (currentUser.role === "receptionist") {
        $("recordPermission").textContent =
            "You can view patient identification and contact details only.";
    } else {
        $("recordPermission").textContent =
            "Administrator view: patient register and system activity. Clinical notes are restricted.";
    }

    renderPatients();
    renderLogs();
});

$("patientForm").addEventListener("submit", event => {
    event.preventDefault();

    if (!currentUser || currentUser.role !== "receptionist") {
        logActivity("UNAUTHORIZED ACTION", "Attempted patient registration");
        return;
    }

    const name = $("patientName").value.trim();
    const age = Number($("patientAge").value);
    const contact = $("patientContact").value.trim();

    if (!name || !Number.isInteger(age) || age < 0 || age > 120 ||
        !/^[0-9+\-\s()]{7,15}$/.test(contact)) {
        $("dashboardMessage").textContent =
            "Enter a valid name, age and contact number.";
        return;
    }

    patients.push({
        id: nextPatientId++,
        name,
        age,
        gender: $("patientGender").value,
        contact,
        clinicalNotes: []
    });

    logActivity("PATIENT REGISTERED", "Patient ID: " + (nextPatientId - 1));

    $("patientForm").reset();
    $("dashboardMessage").textContent = "Patient registered successfully.";
    renderPatients();
});

$("searchPatient").addEventListener("input", renderPatients);

function renderPatients() {
    const list = $("patientList");
    list.replaceChildren();

    if (!currentUser) return;

    const query = $("searchPatient").value.trim().toLowerCase();

    const filtered = patients.filter(patient =>
        String(patient.id).includes(query) ||
        patient.name.toLowerCase().includes(query)
    );

    $("patientCount").textContent = patients.length;

    if (filtered.length === 0) {
        const empty = document.createElement("p");
        empty.textContent = "No matching patient records found.";
        list.appendChild(empty);
        return;
    }

    filtered.forEach(patient => {
        const card = document.createElement("article");
        card.className = "record-card";

        const title = document.createElement("h4");
        title.textContent = "Patient #" + patient.id;
        card.appendChild(title);

        addText(card, "Name: " + patient.name);
        addText(card, "Age: " + patient.age);
        addText(card, "Gender: " + patient.gender);

        if (currentUser.role === "receptionist") {
            addText(card, "Contact: " + patient.contact);
        }

        if (currentUser.role === "doctor") {
            addText(card, "Clinical record access: Authorized");

            patient.clinicalNotes.forEach(note => {
                addText(card, note.time + " — " + note.note);
            });

            const textarea = document.createElement("textarea");
            textarea.maxLength = 1000;
            textarea.placeholder = "Enter clinical note...";
            textarea.setAttribute("aria-label", "Clinical note");
            card.appendChild(textarea);

            const saveButton = document.createElement("button");
            saveButton.textContent = "Save Clinical Note";

            saveButton.addEventListener("click", () => {
                if (!currentUser || currentUser.role !== "doctor") {
                    logActivity("UNAUTHORIZED ACTION",
                        "Attempted clinical note update");
                    return;
                }

                const note = textarea.value.trim();

                if (!note) {
                    $("dashboardMessage").textContent =
                        "Enter a clinical note before saving.";
                    return;
                }

                patient.clinicalNotes.push({
                    time: new Date().toLocaleString(),
                    note: currentUser.username + ": " + note
                });

                logActivity("CLINICAL NOTE ADDED",
                    "Patient ID: " + patient.id);

                $("dashboardMessage").textContent =
                    "Clinical note saved successfully.";

                renderPatients();
            });

            card.appendChild(saveButton);
        }

        if (currentUser.role === "admin") {
            addText(card, "Administrative view: Basic patient details only");
        }

        list.appendChild(card);
    });
}

function addText(parent, message) {
    const paragraph = document.createElement("p");
    paragraph.textContent = message;
    parent.appendChild(paragraph);
}

function renderLogs() {
    const list = $("activityList");
    list.replaceChildren();

    if (!currentUser || currentUser.role !== "admin") return;

    if (auditLogs.length === 0) {
        addText(list, "No activity recorded yet.");
        return;
    }

    auditLogs.forEach(log => {
        const card = document.createElement("article");
        card.className = "record-card";

        addText(card, "Time: " + log.time);
        addText(card, "Account: " + log.username);
        addText(card, "Role: " + log.role);
        addText(card, "Action: " + log.action);
        addText(card, "Details: " + log.details);

        list.appendChild(card);
    });
}

$("refreshLogs").addEventListener("click", () => {
    if (!currentUser || currentUser.role !== "admin") {
        logActivity("UNAUTHORIZED ACTION", "Attempted audit log access");
        return;
    }

    renderLogs();
    logActivity("AUDIT LOG VIEWED", "Administrator reviewed activity");
    renderLogs();
});

$("logout").addEventListener("click", () => {
    if (!currentUser) return;

    logActivity("LOGOUT", "User signed out");

    currentUser = null;
    $("loginForm").reset();
    $("patientForm").reset();
    $("searchPatient").value = "";
    $("loginMessage").textContent = "";
    $("dashboardMessage").textContent = "";

    setVisible("dashboard", false);
    setVisible("loginSection", true);

    renderPatients();
});