let state = {
    user_type: null,
    appliances: [],
    usage_kwh: null,
    usage_level: null,
    recommendations: null
};

const steps = { 1: null, 2: null, 3: null, 4: null, 5: null };
let progressBarFill;

function showStep(stepNumber) {
    Object.values(steps).forEach(step => step && step.classList.add('hidden'));
    const currentStep = steps[stepNumber];
    if (currentStep) {
        currentStep.classList.remove('hidden');
        const progress = ((stepNumber - 1) / (Object.keys(steps).length - 1)) * 100;
        if (progressBarFill) progressBarFill.style.width = `${progress}%`;
    }
}

window.setUserType = (type) => {
    state.user_type = type;
    showStep(2);
    if (state.appliances.length === 0) window.addApplianceRow();
};

window.addApplianceRow = () => {
    const container = document.getElementById('appliances-container');
    const newRow = document.createElement('div');
    newRow.className = "bg-gray-50 p-4 rounded-xl flex items-center space-x-2 shadow-inner";
    newRow.innerHTML = `
        <input type="text" placeholder="Device Name" class="w-1/2 p-2 rounded-lg border border-gray-300 device-name">
        <input type="number" placeholder="Count" min="0" class="w-1/4 p-2 rounded-lg border border-gray-300 device-count">
        <input type="number" placeholder="Rating (1-5)" min="1" max="5" class="w-1/4 p-2 rounded-lg border border-gray-300 device-rating">
        <button type="button" onclick="window.removeApplianceRow(this)" class="text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg">Remove</button>
    `;
    container.appendChild(newRow);
};

window.removeApplianceRow = (button) => {
    button.parentNode.remove();
};

document.addEventListener('DOMContentLoaded', () => {
    steps[1] = document.getElementById('step-1');
    steps[2] = document.getElementById('step-2');
    steps[3] = document.getElementById('step-3');
    steps[4] = document.getElementById('step-4');
    steps[5] = document.getElementById('step-5');
    progressBarFill = document.getElementById('progress-bar-fill');

    document.getElementById('appliance-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const applianceRows = document.querySelectorAll('#appliances-container > div');
        state.appliances = [];
        applianceRows.forEach(row => {
            const name = row.querySelector('.device-name').value;
            const count = row.querySelector('.device-count').value || 0;
            const rating = row.querySelector('.device-rating').value || 0;
            if (name) state.appliances.push({ name, count, rating });
        });
        showStep(3);
    });

    document.getElementById('usage-form').addEventListener('submit', async(e) => {
        e.preventDefault();
        state.usage_kwh = document.getElementById('usage-kwh').value;
        if (!state.usage_kwh) {
            alert("Please enter your estimated monthly usage.");
            return;
        }

        showStep(4);
        try {
            const recommendations = await getRecommendationsFromBackend();
            state.recommendations = recommendations;
            showStep(5);

            const recommendationsContent = document.getElementById('recommendations-content');
            if (state.recommendations) {
                const tipsForLessElectricUse = state.recommendations["tips for less electric uses"]?.map(tip => `<li>${tip}</li>`).join('') || '';
                const ideaForRenewableEnergy = state.recommendations["Idea for Renewable energy"]?.map(tip => `<li>${tip}</li>`).join('') || '';
                const suggestedPlan = state.recommendations["suggested plan and cost for Renewable anergy"]?.map(tip => `<li>${tip}</li>`).join('') || '';

                recommendationsContent.innerHTML = `
                    <div class="mb-6">
                        <h4 class="font-bold">Tips for Less Electric Uses</h4>
                        <ul class="list-disc list-inside">${tipsForLessElectricUse}</ul>
                    </div>
                    <div class="mb-6">
                        <h4 class="font-bold">Idea for Renewable Energy</h4>
                        <ul class="list-disc list-inside">${ideaForRenewableEnergy}</ul>
                    </div>
                    <div class="mb-6">
                        <h4 class="font-bold">Suggested Plan and Cost for Renewable Energy</h4>
                        <ul class="list-disc list-inside">${suggestedPlan}</ul>
                    </div>
                `;
            } else {
                recommendationsContent.innerHTML = `<p>Sorry, I could not generate recommendations at this time.</p>`;
            }
        } catch (error) {
            console.error("Error during API calls:", error);
            alert("An error occurred. Please try again.");
            window.location.reload();
        }
    });

    async function getRecommendationsFromBackend() {
        const payload = {
            user_type: state.user_type,
            appliances: state.appliances,
            usage_kwh: state.usage_kwh
        };
        const apiUrl = "https://electrobot-ojzk.onrender.com/api/recommendations";
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }

    showStep(1);
});

