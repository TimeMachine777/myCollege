// Get all "navbar-burger" elements
const $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);

// Check if there are any navbar burgers
if ($navbarBurgers.length > 0) {
    // Add a click event on each of them
    $navbarBurgers.forEach(el => {
        el.addEventListener('click', () => {
            // Get the target from the "data-target" attribute
            const target = el.dataset.target;
            const $target = document.getElementById(target);

            // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
            el.classList.toggle('is-active');
            $target.classList.toggle('is-active');
        });
    });
}

// Dropdown toggle for Semester
const semesterDropdown = document.getElementById('semesterDropdown');
const profileDropdown = document.getElementById('profileDropdown');

semesterDropdown.addEventListener('click', function () {
    this.classList.toggle('is-active');
});

profileDropdown.addEventListener('click', function () {
    this.classList.toggle('is-active');
});

// Close dropdowns when clicking outside
document.addEventListener('click', function (event) {
    if (!semesterDropdown.contains(event.target)) {
        semesterDropdown.classList.remove('is-active');
    }
    if (!profileDropdown.contains(event.target)) {
        profileDropdown.classList.remove('is-active');
    }
});

//change session sem
const semesterOptions = document.querySelectorAll('#semesterDropdown .dropdown-menu a');
const currPage = document.querySelector('head title').innerText.toLowerCase();

for (let i = 0; i < semesterOptions.length; i++) {
    let ele = semesterOptions[i];
    ele.addEventListener('click', async (event) => {
        let newSem = Number(event.target.innerText.split(' ')[1]);
        // console.log(typeof(Number(newSem)));
        const valToSend = JSON.stringify({ newSem: newSem });

        try {
            const data = await fetchData('/user/updateSessionSem', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: valToSend
            });
            // console.log(response.status);
            if (data['success']) {
                console.log("Sem updated successfully!");
                window.location.href = '/user/' + currPage;
            }
            else {
                if (data['errors']) alert(data['errors']);
                else alert("An error occured while updating sem!");
            }
        }
        catch (error) {
            if (error == 'auth') window.location.href = '/auth/login';
        }
    });
}

// Loading Overlay Code while fetching data ----------------------------------------

async function fetchData(url, options) {
    const loadingOverlay = document.querySelector('.loading-overlay');
    loadingOverlay.classList.remove('hide');
    // console.log("Inside fetchData...");
    try {

        //adding a custom header to identify fetch (AJAX) requests
        //will help in middleware where redirect can be stopped for
        //such requests so that double requests are not made to the same page
        options.headers['X-Requested-With'] = 'XMLHttpRequest';

        const results = await fetch(url, options);

        try {
            // console.log("INside nested try..");
            const data = await results.json();
            loadingOverlay.classList.add('hide');
            // console.log(data);
            return data;
        }
        catch (error1) {
            console.log("User not logged in! Redirecting to login page...");
            loadingOverlay.classList.add('hide');
            throw "auth";
        }
    }
    catch (error) {
        if (error == 'auth') throw error;
        else {
            loadingOverlay.classList.add('hide');
            console.log(error);
            alert("An error has occured while fetching data!");
            throw 'fetch';
        }
    }
}


// Notification delete button js code---------------------
(document.querySelectorAll('.notification .delete') || []).forEach(($delete) => {
    const $notification = $delete.parentNode;

    $delete.addEventListener('click', () => {
        $notification.parentNode.removeChild($notification);
    });
});