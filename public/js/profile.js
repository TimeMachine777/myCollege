// Password strength indicator-----------------------------
// Function to assess password strength
function assessPasswordStrength(password) {
    let score = 0;

    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[\W_]/.test(password)) score += 1;
    if (/^[A-Za-z0-9!@#$%^&*()]+$/.test(password)) {
        score += 1;
    } else {
        score = 0;
    }

    return score;
}

document.querySelector('#change-password-card input[name="new_password"]').addEventListener('input', function (event) {
    const password = event.target.value;
    const strengthScore = assessPasswordStrength(password);
    const strengthText = document.getElementById('password-strength-text');

    let strengthMessage = '';
    let strengthColor = '';

    switch (strengthScore) {
        case 6:
            strengthMessage = 'Very Strong';
            strengthColor = 'green';
            break;
        case 5:
            strengthMessage = 'Strong';
            strengthColor = 'blue';
            break;
        case 4:
            strengthMessage = 'Moderate';
            strengthColor = 'orange';
            break;
        case 3:
            strengthMessage = 'Weak';
            strengthColor = 'red';
            break;
        default:
            strengthMessage = 'Very Weak';
            strengthColor = 'darkred';
    }

    strengthText.textContent = `Strength: ${strengthMessage}`;
    strengthText.style.color = strengthColor;
});


// change password Form---------------
const changePasswordBtn=document.querySelector('#change-password-btn');
const changePasswordSubmitBtn=document.querySelector('#change-password-submit-btn');
const changePasswordCancelBtn=document.querySelector('#change-password-cancel-btn');
const changePasswordForm=document.querySelector('#change-password-card form');
const changePasswordFormDiv=document.querySelector('#change-password-card .card-content');

changePasswordBtn.addEventListener('click', (event) => {
    changePasswordFormDiv.classList.remove('hide');
    changePasswordBtn.classList.add('hide');
});

changePasswordCancelBtn.addEventListener('click', (event) => {
    changePasswordForm.reset();
    changePasswordFormDiv.classList.add('hide');
    changePasswordBtn.classList.remove('hide');
});

changePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const curr_password= changePasswordForm.querySelector('input[name="curr_password"]').value;
    const new_password= changePasswordForm.querySelector('input[name="new_password"]').value;
    const repeat_new_password= changePasswordForm.querySelector('input[name="repeat_new_password"]').value;

    if(new_password!=repeat_new_password) {
        return alert('New password and repeat new password are not same!');
    }
    const dataToSend= {
        curr_password: curr_password,
        new_password: new_password,
        repeat_new_password: repeat_new_password,
    };

    try {
        const data = await fetchData('/user/changePassword', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
        });
        if (data['success']) {
            console.log("Password changed successfully!");
            window.location.href = '/user/profile';
        }
        else {
            if (data['errors']) alert(data['errors']);
            else alert("An error occured while changing the password!");
        }
    }
    catch (error) {
        if (error == 'auth') window.location.href = '/auth/login';
    }
});


//Change Other details --------------------
const changeDetailsBtn=document.querySelector('#change-user-details-btn');
const changeDetailsSubmitBtn=document.querySelector('#change-user-details-submit-btn');
const changeDetailsCancelBtn=document.querySelector('#change-user-details-cancel-btn');
const changeDetailsForm=document.querySelector('#change-user-details-card form');
const changeDetailsFormDiv=document.querySelector('#change-user-details-card .card-content');

changeDetailsBtn.addEventListener('click', (event) => {
    changeDetailsFormDiv.classList.remove('hide');
    changeDetailsBtn.classList.add('hide');
});

changeDetailsCancelBtn.addEventListener('click', (event) => {
    changeDetailsForm.reset();
    changeDetailsFormDiv.classList.add('hide');
    changeDetailsBtn.classList.remove('hide');
});

changeDetailsForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name= changeDetailsForm.querySelector('input[name="name"]').value;
    const roll_no= changeDetailsForm.querySelector('input[name="roll_no"]').value;
    const college= changeDetailsForm.querySelector('input[name="college"]').value;
    const current_sem= changeDetailsForm.querySelector('input[name="current_sem"]').value;

    const dataToSend= {
        name: name,
        roll_no: roll_no,
        college: college,
        current_sem: current_sem,
    };

    try {
        const data = await fetchData('/user/changeUserDetails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dataToSend),
        });
        if (data['success']) {
            console.log("User details changed successfully!");
            window.location.href = '/user/profile';
        }
        else {
            if (data['errors']) alert(data['errors']);
            else alert("An error occured while changing the user details!");
        }
    }
    catch (error) {
        if (error == 'auth') window.location.href = '/auth/login';
    }
});