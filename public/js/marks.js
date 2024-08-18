
// Marks specific code ---------------------------------------------

const editBtns=document.querySelectorAll('.edit-marks');
const confirmEditBtns=document.querySelectorAll('.confirmEdit-marks');
const cancelEditBtns=document.querySelectorAll('.cancelEdit-marks');



for(let i=0;i<editBtns.length;i++) {
    const editBtn=editBtns[i];
    const confirmEditBtn=confirmEditBtns[i];
    const cancelEditBtn=cancelEditBtns[i];
    const courseID=editBtn.getAttribute('course-id');
    const marksInputs=document.querySelectorAll('.input.'+courseID);

    //storing original marks values------
    const quiz1Default=marksInputs[0].value;
    const midSemDefault=marksInputs[1].value;
    const quiz2Default=marksInputs[2].value;
    const endSemDefault=marksInputs[3].value;
    const internalDefault=marksInputs[4].value;


    //adding event listeners on update buttons------------
    editBtn.addEventListener('click', (event) => {
        confirmEditBtn.classList.toggle('hide');
        cancelEditBtn.classList.toggle('hide');
        editBtn.classList.toggle('hide');
        for(let j of marksInputs) {
            j.disabled=false;
        }
    });

    cancelEditBtn.addEventListener('click', (event) => {
        //resetting values--------
        marksInputs[0].value=quiz1Default;
        marksInputs[1].value=midSemDefault;
        marksInputs[2].value=quiz2Default;
        marksInputs[3].value=endSemDefault;
        marksInputs[4].value=internalDefault;

        confirmEditBtn.classList.toggle('hide');
        cancelEditBtn.classList.toggle('hide');
        editBtn.classList.toggle('hide');
        for(let j of marksInputs) {
            j.disabled=true;
        }
    });

    confirmEditBtn.addEventListener('click', async (event) => {
        const dataToSend={cid:courseID};
        for(let j of marksInputs) {
            dataToSend[j.name]=j.value;
            if(j.name){
                if(j.name=='quiz1' && (j.value>10 || j.value<0)) {
                    alert('Quiz1 value should be in the range [0,10] or blank.');
                    return;
                }
                else if(j.name=='quiz2' && (j.value>10 || j.value<0)) {
                    alert('Quiz2 value should be in the range [0,10] or blank.');
                    return;
                }
                else if(j.name=='mid_sem' && (j.value>25 || j.value<0)) {
                    alert('Mid Sem value should be in the range [0,25] or blank.');
                    return;
                }
                else if(j.name=='end_sem' && (j.value>50 || j.value<0)) {
                    alert('End Sem value should be in the range [0,50] or blank.');
                    return;
                }
                else if(j.name=='internal' && (j.value>5 || j.value<0)) {
                    alert('Internal value should be in the range [0,5] or blank.');
                    return;
                }
            }
        }

        try{
            const data= await fetchData('/user/marks', {
                method: 'PUT',
                headers: {
                    'Content-Type':'application/json'
                },
                body: JSON.stringify(dataToSend),
            });
            if (data['success']) {
                console.log("Attendance updated!");
                window.location.href = '/user/marks';
            }
            else {
                if(data['errors']) alert(data['errors']);
                else alert("An error occured while updating the marks!");
            }
        }
        catch(error) {
            if (error == 'auth') window.location.href = '/auth/login';
        }
    });
}