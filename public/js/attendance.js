
// Attendance specific code ----------------------------------------------------------------

//attendance show,edit & delete code
const attendanceDetailBtns = document.querySelectorAll('.attendance-details-btn');
const attendanceDetailsCard = document.querySelector('#attendance-details-card');

function displayAttendanceTable(data, courseID) {
    const tableBody = document.getElementById('attendance-table-body');
    tableBody.innerHTML = null;
    for (let i = 0; i < data.length; i++) {
        const entry = data[i];
        const attendanceEditForm= document.createElement('form');
        const row = document.createElement('tr');

        // console.log(entry.course_date);
        // Date Cell (Input for SQL timestamp with timezone)
        const dateCell = document.createElement('td');
        const dateInput = document.createElement('input');
        dateInput.type = 'datetime-local';
        const date = new Date(entry.course_date);
        const timezoneOffset = date.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
        const localISOTime = new Date(date - timezoneOffset).toISOString().slice(0, 19); //taking only till seconds and not milliseconds
        // console.log(localISOTime);
        dateInput.step = 1;
        dateInput.value = localISOTime;
        dateInput.required=true;

        // setting max input date time
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        const maxDateTime = new Date(endOfDay-timezoneOffset).toISOString().slice(0, 19);
        dateInput.max = maxDateTime;

        dateInput.disabled = true;
        dateInput.required = true;
        dateInput.classList.add('date-input', 'input');
        const dateControlDiv = document.createElement('div');
        dateControlDiv.classList.add('control');
        const dateFieldDiv = document.createElement('div');
        dateFieldDiv.classList.add('field');
        dateControlDiv.appendChild(dateInput);
        dateFieldDiv.appendChild(dateControlDiv);
        dateCell.appendChild(dateFieldDiv);
        row.appendChild(dateCell);

        // Status Cell (Dropdown for 'A' or 'P')
        const statusCell = document.createElement('td');
        const statusSelect = document.createElement('select');
        statusSelect.disabled = true;
        statusSelect.required=true;
        statusSelect.classList.add('status-select');

        const optionP = document.createElement('option');
        optionP.value = 'P';
        optionP.textContent = 'P';
        if (entry.status === 'P') optionP.selected = true;
        statusSelect.appendChild(optionP);

        const optionA = document.createElement('option');
        optionA.value = 'A';
        optionA.textContent = 'A';
        if (entry.status === 'A') optionA.selected = true;
        statusSelect.appendChild(optionA);

        const selectParentDiv = document.createElement('div');
        selectParentDiv.classList.add('select');
        selectParentDiv.appendChild(statusSelect);
        statusCell.appendChild(selectParentDiv);
        row.appendChild(statusCell);

        // Actions Cell (Edit, cancelEdit, confirmEdit and Delete buttons)
        const actionsCell = document.createElement('td');
        const editButton = document.createElement('span');
        editButton.classList.add('icon', 'is-large', 'table-icon-edit');
        editButton.innerHTML = '<i class="fas fa-lg fa-pen"></i>';

        const deleteButton = document.createElement('span');
        deleteButton.classList.add('icon', 'is-large', 'table-icon-delete');
        deleteButton.innerHTML = '<i class="fas fa-lg fa-trash-alt"></i>';

        const cancelEditButton = document.createElement('span');
        cancelEditButton.classList.add('icon', 'is-large', 'table-icon-cancelEdit');
        cancelEditButton.innerHTML = '<i class="fas fa-lg fa-times"></i>';
        cancelEditButton.style.display = 'none';

        const tickButton = document.createElement('span');
        tickButton.classList.add('icon', 'is-large', 'table-icon-tick');
        tickButton.innerHTML = '<i class="fas fa-lg fa-check"><button type="submit"></button></i>';
        tickButton.style.display = 'none';

        // Button event listeners-------
        deleteButton.addEventListener('click', async () => {
            // console.log('Delete clicked for date:', entry.course_date);
            if (confirm("Are you sure you want to delete this?")) {
                try{
                    const data= await fetchData('/user/attendance', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            aid: entry.aid,
                            cid: courseID,
                            prev_status: entry.status
                        })
                    });
                    if (data['success']) {
                        console.log("Attendance deleted!");
                        window.location.href = '/user/attendance';
                    }
                    else {
                        if(data['errors']) alert(data['errors']);
                        else alert("An error occured while deleting the attendance!");
                    }
                }
                catch(error) {
                    if (error == 'auth') window.location.href = '/auth/login';
                }
            }
        });

        editButton.addEventListener('click', () => {
            dateInput.disabled = false;
            statusSelect.disabled = false;
            editButton.style.display = 'none';
            tickButton.style.display = 'inline-flex';
            cancelEditButton.style.display = 'inline-flex';
        });

        cancelEditButton.addEventListener('click', () => {
            dateInput.value = localISOTime;
            statusSelect.value= entry.status;
            dateInput.disabled = true;
            statusSelect.disabled = true;
            editButton.style.display = 'inline-flex';
            tickButton.style.display = 'none';
            cancelEditButton.style.display = 'none';
        });

        tickButton.addEventListener('click', async () => {

            /* if(dateInput.value) {
                if(dateInput.value>maxDateTime) {
                    alert('Date-time should be less than: '+endOfDay.toLocaleString());
                    return;
                } */

                const dateToSend = new Date(dateInput.value).toISOString();
                // console.log(dateInput.value);
                // console.log(dateToSend);
    
                const formData = {
                    aid: entry.aid,
                    cid: courseID,
                    course_date: dateToSend,
                    status: statusSelect.value,
                    prev_status: entry.status
                };
    
                try{
                    const data= await fetchData('/user/attendance', {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(formData)
                    });
                    if (data['success']) {
                        console.log("Attendance updated!");
                        window.location.href = '/user/attendance';
                    }
                    else {
                        if(data['errors']) alert(data['errors']);
                        else alert("An error occured while updating the attendance!");
                    }
                }
                catch(error) {
                    if (error == 'auth') window.location.href = '/auth/login';
                }
            /* }
            else{
                alert('Date cannot be empty!');
            } */
        });

        const buttonContainer = document.createElement('div');
        buttonContainer.classList.add('button-container');
        buttonContainer.appendChild(editButton);
        buttonContainer.appendChild(tickButton);
        buttonContainer.appendChild(cancelEditButton);
        buttonContainer.appendChild(deleteButton);

        actionsCell.appendChild(buttonContainer);
        row.appendChild(actionsCell);

        tableBody.appendChild(row);
    }
}


for (let i = 0; i < attendanceDetailBtns.length; i++) {
    const btn = attendanceDetailBtns[i];
    btn.addEventListener('click', async (event) => {
        const courseID = btn.getAttribute('course-id');
        const courseName = document.querySelector('.card[course-id="' + courseID + '"] .course-name').innerText;
        const courseAttendance = document.querySelector('.card[course-id="' + courseID + '"] .course-attendance').innerHTML;
        const valToSend = JSON.stringify({ cid: courseID });

        try{
            const data= await fetchData('/user/attendance', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: valToSend
            });
            if (data['success']) {
                document.querySelector('#attendance-details-course-id').innerText = courseID;
                document.querySelector('#attendance-details-course-name').innerText = courseName;
                document.querySelector('#attendance-details-count').innerHTML = courseAttendance;
                document.querySelector('#add-attendance-section').classList.remove('hide');
                document.querySelector('#add-attendance-btn').setAttribute('course-id', courseID);
                const attendanceData = data['attendance'];
                // console.log(attendanceData);
                displayAttendanceTable(attendanceData, courseID);
                window.location.href = '#attendance-details-card';
            }
            else {
                if(data['errors']) alert(data['errors']);
                else alert("An error occured while retrieving the attendance data!");
            }
        }
        catch(error) {
            if (error == 'auth') window.location.href = '/auth/login';
        }
    });
}

// add attendance form code
let addBtn = document.querySelector('#add-attendance-btn');
let cancelAddBtn = document.querySelector('#add-attendance-cancel-btn');
const addForm = document.querySelector('#add-attendance-card form');
const addFormDiv = document.querySelector('#add-attendance-card .card-content');
const addCardFooter=document.querySelector('#add-attendance-card .card-footer');

addBtn.addEventListener('click', async (event) => {
    addFormDiv.classList.remove('hide');
    addCardFooter.classList.add('hide');
});

addForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const courseID = addBtn.getAttribute('course-id');
    const dateInput = addForm.querySelector("input[name='course_date']");
    const statusSelect = addForm.querySelector("select[name='status']");
    const dateToSend = new Date(dateInput.value).toISOString();
    // console.log(courseID);
    const addJSONToSend = {
        cid: courseID,
        course_date: dateToSend,
        status: statusSelect.value
    };

    try{
        const data= await fetchData('/user/attendance/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(addJSONToSend)
        });
        if (data['success']) {
            console.log("Attendance added successfully!");
            window.location.href = '/user/attendance';
        }
        else {
            if(data['errors']) alert(data['errors']);
            else alert("An error occured while adding the attendance!");
        }
    }
    catch(error) {
        if (error == 'auth') window.location.href = '/auth/login';
    }
});

cancelAddBtn.addEventListener('click', (event) => {
    addForm.reset();
    addFormDiv.classList.add('hide');
    addCardFooter.classList.remove('hide');
});
