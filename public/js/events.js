
// UTC DateTime to Local conversion function -------------------------

const getLocalISODateTime = function (ISODate) {
    const date = new Date(ISODate);
    const timezoneOffset = date.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
    const localISODateTime = new Date(date - timezoneOffset).toISOString().slice(0, 19); //taking only till seconds and not milliseconds
    return localISODateTime;
};

// Events specific code ---------------------------------------------
const addEventBtn = document.querySelector('#event-add-btn');
const addEventFormDiv = document.querySelector('.add-event-card .card-content');
const addEventCancelBtn = document.querySelector('#add-event-cancel-btn');
const addEventForm = document.querySelector('.add-event-card form');

addEventBtn.addEventListener('click', function (event) {
    this.classList.toggle('hide');
    addEventFormDiv.classList.toggle('hide');
});

addEventCancelBtn.addEventListener('click', (event) => {
    addEventForm.reset();
    addEventBtn.classList.toggle('hide');
    addEventFormDiv.classList.toggle('hide');
    window.location.href = '#';
});

addEventForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    // alert("Submit was pressed!");
    const event_name = addEventForm.querySelector('input[name="event_name"]').value;
    const type = addEventForm.querySelector('select[name="type"]').value;
    const sem = addEventForm.querySelector('input[name="sem"]').value;
    const description = addEventForm.querySelector('textarea[name="description"]').value;
    let issue_date = addEventForm.querySelector('input[name="issue_date"]').value;
    let deadline = addEventForm.querySelector('input[name="deadline"]').value;
    let completion_date = addEventForm.querySelector('input[name="completion_date"]').value;
    const cid = addEventForm.querySelector('select[name="cid"]').value;

    issue_date = new Date(issue_date).toISOString();
    deadline = new Date(deadline).toISOString();
    if (completion_date) new Date(completion_date).toISOString();


    const dataToSend = {
        event_name: event_name,
        type: type,
        sem: sem,
        description: description,
        issue_date: issue_date,
        deadline: deadline,
        completion_date: completion_date,
        cid: cid
    };
    try {
        const data = await fetchData('/user/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
        });
        // console.log("Fetch data result:");
        // console.log(data);
        if (data['success']) {
            console.log("Event added successfully!");
            window.location.href = '/user/events';
        }
        else {
            if (data['errors']) alert(data['errors']);
            else alert("An error occured while adding the event!");
        }
    }
    catch (error) {
        if (error == 'auth') window.location.href = '/auth/login';
    }
});

const addEventIssueDate = document.querySelector('input.add-event-issue-date');
const addEventDeadline = document.querySelector('input.add-event-deadline');
const addEventCompletionDate = document.querySelector('input.add-event-completion-date');

addEventIssueDate.addEventListener('change', function (event) {
    const minDateValue = addEventIssueDate.value;

    //resetting dates value on each change: ------
    addEventDeadline.value = '';
    addEventCompletionDate.value = '';
    //-----------------------
    if (minDateValue) {
        // console.log(minDateValue);
        addEventDeadline.setAttribute('min', minDateValue);
        addEventCompletionDate.setAttribute('min', minDateValue);
        document.querySelector('div.add-event-deadline').classList.remove('hide');
        document.querySelector('div.add-event-completion-date').classList.remove('hide');
    }
    else {
        document.querySelector('div.add-event-deadline').classList.add('hide');
        document.querySelector('div.add-event-completion-date').classList.add('hide');
    }
});

const addEventSem = document.querySelector('input.add-event-sem');
const addEventCID = document.querySelector('select.add-event-course-id');

function addCourseOptions(EventCID, allowedCourseID) {
    // console.log("hello");
    // console.log(allowedCourseID);
    for (let i = 0; i < allowedCourseID.length; i++) {
        const cid = allowedCourseID[i]['cid'];
        const newOption = document.createElement('option');
        newOption.value = cid;
        newOption.innerText = cid;
        EventCID.appendChild(newOption);
    }
}

addEventSem.addEventListener('change', async (event) => {
    const semValue = Number(addEventSem.value);

    //resetting cid value on each change: -------------
    addEventCID.innerHTML = '';
    const newOption = document.createElement('option');
    newOption.innerText = 'None';
    newOption.value = '';
    newOption.selected = true;
    addEventCID.appendChild(newOption);
    //------------------
    if (semValue) {
        // console.log(semValue);
        try {
            // console.log("JUst before fetchData...");
            const data = await fetchData('/user/events/getCID', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sem: semValue })
            });
            // console.log("Fetch data result:");
            // console.log(data);
            if (data['success']) {
                addCourseOptions(addEventCID, data['allowedCourseID']);
            }
            else {
                if (data['errors']) alert(data['errors']);
                else alert("An error occured while fetching courses for the chosen sem!");
            }
        }
        catch (error) {
            if (error == 'auth') window.location.href = '/auth/login';
        }
        document.querySelector('div.add-event-course-id').classList.remove('hide');
    }
    else {
        document.querySelector('div.add-event-course-id').classList.add('hide');
    }
});


// Event details, edit & delete card code---------------------
const eventDetailBtns = document.querySelectorAll('.event-details-btn');
const eventDetailsContent = document.querySelector('#event-details-content');
const editEventForm = document.querySelector('.edit-event-card form');
const eventDeleteBtn = document.querySelectorAll('.event-delete-btn');

async function displayEventDetails(details) {
    //setting static content first of the details card
    document.querySelector('#event-details-event-id').innerText = details['eid'];
    document.querySelector('#event-details-event-name').innerText = details['event_name'];
    document.querySelector('#event-details-type').innerText = details['type'];
    document.querySelector('#event-details-course-id').innerText = details['cid'];
    document.querySelector('#event-details-issue-date').innerText = new Date(details['issue_date']).toLocaleString();
    document.querySelector('#event-details-deadline').innerText = new Date(details['deadline']).toLocaleString();
    if (details['completion_date']) document.querySelector('#event-details-completion-date').innerText = new Date(details['completion_date']).toLocaleString();
    document.querySelector('#event-details-status').innerText = details['status'];
    document.querySelector('#event-details-desc').innerText = details['description'];

    // console.log("ALL OK part1 in displayEventDetails..."); //debug

    const localISO_issue_date = getLocalISODateTime(details.issue_date);
    const localISO_deadline = getLocalISODateTime(details.deadline);
    let localISO_completion_date = null;
    if (details.completion_date) localISO_completion_date = getLocalISODateTime(details.completion_date);

    // console.log("ALL OK part2 in displayEventDetails..."); //debug

    editEventForm.querySelector('input[name="event_name"]').setAttribute('value', details['event_name']);
    editEventForm.querySelector('select[name="type"] option[value="' + details['type'] + '"]').setAttribute('selected', true);
    editEventForm.querySelector('input[name="sem"]').setAttribute('value', details['sem']);
    editEventForm.querySelector('textarea[name="description"]').value = details['description'];
    editEventForm.querySelector('input[name="issue_date"]').setAttribute('value', localISO_issue_date);
    editEventForm.querySelector('input[name="deadline"]').setAttribute('value', localISO_deadline);
    editEventForm.querySelector('input[name="deadline"]').setAttribute('min', localISO_issue_date);
    editEventForm.querySelector('input[name="completion_date"]').setAttribute('value', localISO_completion_date);
    editEventForm.querySelector('input[name="completion_date"]').setAttribute('min', localISO_issue_date);

    // console.log("ALL OK part3 in displayEventDetails..."); //debug

    const editEventCID = editEventForm.querySelector('select[name="cid"]');

    //resetting cid value on each change: -------------
    editEventCID.innerHTML = '';
    const newOption = document.createElement('option');
    newOption.innerText = 'None';
    newOption.value = '';
    newOption.selected = true;
    editEventCID.appendChild(newOption);

    //fetching CIDs for current sem
    try {
        // console.log("JUst before fetchData...");
        const data = await fetchData('/user/events/getCID', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sem: details['sem'] })
        });
        // console.log("Fetch data result:");
        // console.log(data);
        if (data['success']) {
            addCourseOptions(editEventCID, data['allowedCourseID']);
        }
        else {
            if (data['errors']) alert(data['errors']);
            else alert("An error occured while fetching courses for the sem for the chosen event!");
        }
    }
    catch (error) {
        if (error == 'auth') window.location.href = '/auth/login';
    }
    // console.log("ALL OK part4 in displayEventDetails..."); //debug
    if (details['cid']) editEventForm.querySelector('select[name="cid"] option[value="' + details['cid'] + '"]').selected = true;
    // console.log("ALL OK part5 in displayEventDetails..."); //debug
}

for (let i = 0; i < eventDetailBtns.length; i++) {
    const btn = eventDetailBtns[i];
    const eid = btn.getAttribute('event-id');
    btn.addEventListener('click', async (event) => {

        try {
            const data = await fetchData('/user/events/getEvent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eid: eid })
            });
            // console.log("Fetch data result:");
            // console.log(data);
            if (data['success']) {
                // console.log("before displayEventDetails!");
                await displayEventDetails(data['details']);
                // console.log("after displayEventDetails!");
                editEventForm.setAttribute('event-id', eid);
                document.querySelector('#edit-event-section').classList.remove('hide');
                window.location.href = '#event-details-card';
            }
            else {
                if (data['errors']) alert(data['errors']);
                else alert("An error occured while fetching the event details!");
            }
        }
        catch (error) {
            if (error == 'auth') window.location.href = '/auth/login';
        }
    });

    const btnDelete = eventDeleteBtn[i];
    btnDelete.addEventListener('click', async (event) => {
        if (confirm("Are you sure you want to delete event with ID:" + eid)) {
            try {
                const data = await fetchData('/user/events', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ eid: eid })
                });
                // console.log("Fetch data result:");
                // console.log(data);
                if (data['success']) {
                    console.log("Event deleted successfully with ID:" + eid);
                    window.location.href = '/user/events';
                }
                else {
                    if (data['errors']) alert(data['errors']);
                    else alert("An error occured while deleting the event!");
                }
            }
            catch (error) {
                if (error == 'auth') window.location.href = '/auth/login';
            }
        }
    })
};

const showEditEventBtn = document.querySelector('#event-edit-form-btn');
const editEventFormDiv = document.querySelector('.edit-event-card .card-content');

showEditEventBtn.addEventListener('click', (event) => {
    showEditEventBtn.classList.add('hide');
    editEventFormDiv.classList.remove('hide');
});

const editEventCancelBtn = document.querySelector('#edit-event-cancel-btn');

editEventCancelBtn.addEventListener('click', (event) => {
    editEventForm.reset();
    editEventFormDiv.classList.add('hide');
    showEditEventBtn.classList.remove('hide');
});

editEventForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    // alert("Submit was pressed!");
    const eid = editEventForm.getAttribute('event-id');
    const event_name = editEventForm.querySelector('input[name="event_name"]').value;
    const type = editEventForm.querySelector('select[name="type"]').value;
    const sem = editEventForm.querySelector('input[name="sem"]').value;
    const description = editEventForm.querySelector('textarea[name="description"]').value;
    let issue_date = editEventForm.querySelector('input[name="issue_date"]').value;
    let deadline = editEventForm.querySelector('input[name="deadline"]').value;
    let completion_date = editEventForm.querySelector('input[name="completion_date"]').value;
    const cid = editEventForm.querySelector('select[name="cid"]').value;

    issue_date = new Date(issue_date).toISOString();
    deadline = new Date(deadline).toISOString();
    if (completion_date) new Date(completion_date).toISOString();


    const dataToSend = {
        eid: eid,
        event_name: event_name,
        type: type,
        sem: sem,
        description: description,
        issue_date: issue_date,
        deadline: deadline,
        completion_date: completion_date,
        cid: cid
    };
    try {
        const data = await fetchData('/user/events', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
        });
        // console.log("Fetch data result:");
        // console.log(data);
        if (data['success']) {
            console.log("Event updated successfully!");
            window.location.href = '/user/events';
        }
        else {
            if (data['errors']) alert(data['errors']);
            else alert("An error occured while editing the event!");
        }
    }
    catch (error) {
        if (error == 'auth') window.location.href = '/auth/login';
    }
});

const editEventIssueDate = document.querySelector('input.edit-event-issue-date');
const editEventDeadline = document.querySelector('input.edit-event-deadline');
const editEventCompletionDate = document.querySelector('input.edit-event-completion-date');

editEventIssueDate.addEventListener('change', function (event) {
    const minDateValue = editEventIssueDate.value;

    //resetting dates value on each change: ------
    editEventDeadline.value = '';
    editEventCompletionDate.value = '';
    //-----------------------
    if (minDateValue) {
        // console.log(minDateValue);
        editEventDeadline.setAttribute('min', minDateValue);
        editEventCompletionDate.setAttribute('min', minDateValue);
        document.querySelector('div.edit-event-deadline').classList.remove('hide');
        document.querySelector('div.edit-event-completion-date').classList.remove('hide');
    }
    else {
        document.querySelector('div.edit-event-deadline').classList.add('hide');
        document.querySelector('div.edit-event-completion-date').classList.add('hide');
    }
});

const editEventSem = document.querySelector('input.edit-event-sem');
const editEventCID = document.querySelector('select.edit-event-course-id');

editEventSem.addEventListener('change', async (event) => {
    const semValue = Number(editEventSem.value);

    //resetting cid value on each change: -------------
    editEventCID.innerHTML = '';
    const newOption = document.createElement('option');
    newOption.innerText = 'None';
    newOption.value = '';
    newOption.selected = true;
    editEventCID.appendChild(newOption);
    //------------------
    if (semValue) {
        // console.log(semValue);
        try {
            // console.log("JUst before fetchData...");
            const data = await fetchData('/user/events/getCID', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sem: semValue })
            });
            // console.log("Fetch data result:");
            // console.log(data);
            if (data['success']) {
                addCourseOptions(editEventCID, data['allowedCourseID']);
            }
            else {
                if (data['errors']) alert(data['errors']);
                else alert("An error occured while fetching the courses for the chosen sem!");
            }
        }
        catch (error) {
            if (error == 'auth') window.location.href = '/auth/login';
        }
        document.querySelector('div.edit-event-course-id').classList.remove('hide');
    }
    else {
        document.querySelector('div.edit-event-course-id').classList.add('hide');
    }
});