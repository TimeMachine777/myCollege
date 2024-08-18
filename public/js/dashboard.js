const circularProgress = document.querySelectorAll(".circular-progress");

Array.from(circularProgress).forEach((progressBar) => {
    const progressValue = progressBar.querySelector(".percentage");
    const innerCircle = progressBar.querySelector(".inner-circle");
    let startValue = 0,
        endValue = Number(progressBar.getAttribute("data-percentage")),
        speed = 10, // Increased speed
        progressColor = progressBar.getAttribute("data-progress-color");

    if (endValue > 0) {
        const progress = setInterval(() => {
            startValue++;
            progressValue.textContent = `${startValue}%`;
            progressValue.style.color = `${progressColor}`;

            innerCircle.style.backgroundColor = `${progressBar.getAttribute(
                "data-inner-circle-color"
            )}`;

            progressBar.style.background = `conic-gradient(${progressColor} ${startValue * 3.6
                }deg,${progressBar.getAttribute("data-bg-color")} 0deg)`;

            if (startValue >= endValue) {
                clearInterval(progress); // Stop the interval when the target percentage is reached
            }
        }, speed);
    }
    else if (endValue === 0) {
        progressValue.textContent = `${startValue}%`;
        progressValue.style.color = `${progressColor}`;

        innerCircle.style.backgroundColor = `${progressBar.getAttribute(
            "data-inner-circle-color"
        )}`;

        progressBar.style.background = `conic-gradient(${progressColor} ${startValue * 3.6
            }deg,${progressBar.getAttribute("data-bg-color")} 0deg)`;
    }
    else {
        progressValue.textContent = '- %';
    }
});
