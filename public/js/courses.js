
//------------------------------------------------------------------------
//courses specific code
let editBtns = document.querySelectorAll('.course-edit-btn');
let cancelEditBtns = document.querySelectorAll('.course-edit-cancel-btn');
let deleteBtns = document.querySelectorAll('.course-delete-btn');
let editForms = document.querySelectorAll('.course-card form');

async function editBtnCb(event) {
    const editBtn = event.target;
    const courseID = editBtn.getAttribute('course-id');
    const editForm = document.querySelector('form[course-id="' + courseID + '"]');
    const courseDetails = document.querySelector('.course-card[course-id="' + courseID + '"] .content');
    const cardFooter = document.querySelector('.card-footer[course-id="' + courseID + '"]');

    editForm.classList.remove('hide');
    courseDetails.classList.add('hide');
    cardFooter.classList.add('hide');
}

async function courseEditSubmitCb(event) {
    event.preventDefault();

    const editForm = event.target;
    const courseID = editForm.getAttribute('course-id');
    let formToSend = new URLSearchParams(new FormData(editForm));
    formToSend.append('prev_cid', courseID); //used for updating the academics table
    formToSend = formToSend.toString();

    try {
        const data = await fetchData('/user/courses', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formToSend
        });
        if (data['success']) {
            console.log("Course data edited successfully!");
            window.location.href = '/user/courses';
        }
        else {
            if (data['errors']) alert(data['errors']);
            else alert("An error occured while editing the course!");
        }
    }
    catch (error) {
        if (error == 'auth') window.location.href = '/auth/login';
    }
}

function cancelEditBtnCb(event) {
    const cancelEditBtn = event.target;
    const courseID = cancelEditBtn.getAttribute('course-id');
    const editForm = document.querySelector('form[course-id="' + courseID + '"]');
    const courseDetails = document.querySelector('.course-card[course-id="' + courseID + '"] .content');
    const cardFooter = document.querySelector('.card-footer[course-id="' + courseID + '"]');

    editForm.reset();
    courseDetails.classList.remove('hide');
    editForm.classList.add('hide');
    cardFooter.classList.remove('hide');
}

async function deleteBtnCb(event) {
    const deleteBtn = event.target;
    const courseID = deleteBtn.getAttribute('course-id');
    if (confirm("Are you sure you want to delete course: " + courseID)) {
        let bodyContent = { 'cid': courseID };
        bodyContent = JSON.stringify(bodyContent);
        try {
            const data = await fetchData('/user/courses', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: bodyContent
            });
            if (data['success']) {
                console.log("Course deleted successfully!");
                window.location.href = '/user/courses';
            }
            else {
                if (data['errors']) alert(data['errors']);
                else alert("An error occured while deleting the course!");
            }
        }
        catch (error) {
            if (error == 'auth') window.location.href = '/auth/login';
        }
    }
}

for (let i = 0; i < editBtns.length; i++) {
    editBtns[i].addEventListener('click', editBtnCb);
    cancelEditBtns[i].addEventListener('click', cancelEditBtnCb);
    deleteBtns[i].addEventListener('click', deleteBtnCb);
    editForms[i].addEventListener('submit', courseEditSubmitCb);
}

//add course code--------------
let courseAddBtn = document.querySelector('#course-add-btn');
// let courseAddSubmitBtn=document.querySelector('#course-add-submit-btn');
let cancelAddBtn = document.querySelector('#course-add-cancel-btn');
const courseAddForm = document.querySelector('#add-course-card form');
const courseAddFormDiv = document.querySelector('#add-course-card .card-content');

courseAddBtn.addEventListener('click', async (event) => {
    courseAddBtn.classList.add('hide');
    courseAddFormDiv.classList.remove('hide');
    window.location.href='#add-course-card';
});

cancelAddBtn.addEventListener('click', (event) => {
    courseAddForm.reset();
    courseAddBtn.classList.remove('hide');
    courseAddFormDiv.classList.add('hide');
});

courseAddForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const addFormToSend = new URLSearchParams(new FormData(courseAddForm)).toString();

    try {
        const data = await fetchData('/user/courses', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: addFormToSend
        });
        if (data['success']) {
            console.log("Course added successfully!");
            window.location.href = '/user/courses';
        }
        else {
            if (data['errors']) alert(data['errors']);
            else alert("An error occured while adding the course!");
        }
    }
    catch (error) {
        if (error == 'auth') window.location.href = '/auth/login';
    }
});