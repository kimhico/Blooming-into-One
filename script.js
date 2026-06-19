// GLOBAL STATE
let windowGuest = ""; 
let page = 1;

// NAVIGATION HISTORY SYSTEM
let flowHistory = [];

function pushToHistory(screenFunction) {
  flowHistory.push(screenFunction);
}

function handleBack() {
  if (flowHistory.length > 0) {
    let previousScreen = flowHistory.pop();
    previousScreen();
  } else {
    showNameInput();
  }
}

// INITIAL SCREEN
showNameInput();

function showNameInput() {
  flowHistory = []; // Reset history when starting fresh
  document.getElementById("screen").innerHTML = `
    <div class="search-form-wrapper">
      <h2>Find your name:</h2>
      <input id="guest" placeholder="Enter your name...">
      <button onclick="searchName()">Find</button>
    </div>
  `;
}

// SEARCH FUNCTION
async function searchName() {
  const guestInput = document.getElementById("guest").value.trim();
  
  // VALIDATION FIX: Restrain blank searches and prompt them to enter a name instead
  if (!guestInput) {
    document.getElementById("screen").innerHTML = `
      <div class="search-form-wrapper">
        <h2>Please enter your name</h2>
        <p style="font-size: 13px; color: #6b6b6b; margin-bottom: 15px;">The search box cannot be left blank.</p>
        <button onclick="showNameInput()">Try Again</button>
      </div>
    `;
    return;
  }
  
  // Trigger loading screen instantly if input validation passes
  showLoading("Searching list...");

  let response = await fetch(
    "https://script.google.com/macros/s/AKfycbyIvNFICoN16ta_nxYkCfiWsBHuzZgd8v9emDRmp88TqQXadM9d0_ZpZIQRmzkof6dKMQ/exec?guest="
    + encodeURIComponent(guestInput)
  );

  let matches = await response.json();

  if (!matches || matches.length === 0) {
    document.getElementById("screen").innerHTML = `
      <div class="search-form-wrapper">
        <h2>Name is not in the invite list</h2>
        <button onclick="showNameInput()">Try again</button>
      </div>
    `;
    return;
  }

  // Cache search result matches globally to allow back navigation to work perfectly
  window.lastSearchResults = matches;
  renderSelectNameScreen(matches);
}

function renderSelectNameScreen(matches) {
  let html = `
    <div class="screen-content">
      <h2>Select your name</h2>
  `;

  matches.forEach(m => {
    html += `
    <label onclick="selectAndProceed(this)">
      <input
        type="radio"
        name="guest"
        value="${m.name}"
        data-seats="${m.seats || ''}"
        data-companions="${m.companions || ''}"
        data-role="${m.role || ''}"
      >
      ${m.name}
    </label>
    `;
  });

  html += `
      <button class="back-btn" onclick="handleBack()">← Back to Search</button>
    </div>
  `;
  document.getElementById("screen").innerHTML = html;
}

// RENDER RESULTS (Fallback pagination option)
function renderResults(data) {
  let html = `
    <div class="screen-content">
      <h2>Select your name</h2>
  `;

  data.results.forEach(m => {
    html += `
      <label onclick="selectAndProceed(this)">
        <input
          type="radio"
          name="guest"
          value="${m.name}"
          data-seats="${m.seats || ''}"
          data-companions="${m.companions || ''}"
          data-role="${m.role || ''}"
        >
        ${m.name}
      </label>
    `;
  });

  html += `<br>`;

  if ((page * 10) < data.total) {
    html += `<button onclick="nextPage()">Next</button>`;
  }

  if (page > 1) {
    html += `<button onclick="prevPage()">Previous</button>`;
  }

  html += `
      <button class="back-btn" onclick="showNameInput()">← Back to Search</button>
    </div>
  `;
  document.getElementById("screen").innerHTML = html;
}

function confirmName() {
  let radio = document.querySelector('input[name="guest"]:checked');
  if (!radio) return; 

  window.tempCompanions = [];

  let selected = {
    name: radio.value,
    seats: parseInt(radio.getAttribute("data-seats")) || 1,
    companions: radio.getAttribute("data-companions") || "",
    role: radio.getAttribute("data-role") || "" 
  };

  window.currentGuest = selected;

  let companions = selected.companions
    .split(",")
    .map(x => x.trim())
    .filter(x => x.length > 0);

  window.tempCompanions = companions;

  // Set the structural fallback reference logic pointer
  flowHistory = [() => renderSelectNameScreen(window.lastSearchResults)];

  if (selected.seats > 1) {
    editCompanions(); 
  } else {
    window.currentGuest.companions = "";
    window.tempCompanions = [];
    showAttendanceQuestion();
  }
}

function editCompanions() {
  let max = window.currentGuest.seats - 1;
  let companions = window.tempCompanions || [];

  let badgesHtml = "";
  if (companions.length > 0) {
    companions.forEach(c => {
      badgesHtml += `
        <li style="display: block; background: #ffffff; color: #5d534a; font-size: 13px; font-weight: 500; padding: 10px 16px; border-radius: 20px; border: 1px solid rgba(0,0,0,0.05); margin: 6px 0; box-shadow: 0 2px 5px rgba(0,0,0,0.02); text-align: left; width: 100%; box-sizing: border-box;">
          ${c}
        </li>`;
    });
  } else {
    badgesHtml = `<span style="font-style: italic; color: #999;">None entered yet</span>`;
  }

  let html = `
    <div class="screen-content">
      <h2>Review Companions</h2>
      <p style="color: #6b6b6b; font-size: 13px; margin-bottom: 10px;">Your reservation includes <b>${max}</b> companion seat(s):</p>
      
      <div style="background: rgba(255, 255, 255, 0.4); border-radius: 16px; padding: 14px 18px; margin: 15px 0 25px 0; border: 1px dashed rgba(0, 0, 0, 0.08); text-align: left; width: 100%;">
        <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; align-items: flex-start; width: 100%;">
          ${badgesHtml}
        </ul>
      </div>

      <button onclick="pushToHistory(editCompanions); showAttendanceQuestion()">Everything is Correct</button>
      <button onclick="pushToHistory(editCompanions); showCompanionInputForm()">Change Names</button>
      <button class="back-btn" onclick="handleBack()">← Back</button>
    </div>
  `;

  document.getElementById("screen").innerHTML = html;
}

function showCompanionInputForm() {
  let max = window.currentGuest.seats - 1;
  let currentNames = (window.tempCompanions || []).join(", ");

  let html = `
    <div class="screen-content">
      <h2>Edit Companions</h2>
      <p style="font-size:12px; margin-bottom:10px;">Enter up to ${max} names separated by commas:</p>
      <input id="editList" placeholder="Name 1, Name 2" value="${currentNames}">
      <button onclick="saveEditedCompanions()">Update & Next</button>
      <button class="back-btn" onclick="handleBack()">← Cancel</button>
    </div>
  `;

  document.getElementById("screen").innerHTML = html;
}

function saveEditedCompanions() {
  let max = window.currentGuest.seats - 1;
  let input = document.getElementById("editList").value;

  let list = input
    .split(",")
    .map(x => x.trim())
    .filter(x => x.length > 0);

  if (list.length > max) {
    alert(`You can only add up to ${max} companions.`);
    return;
  }

  window.tempCompanions = list;
  showConfirmScreen();
}

function showConfirmScreen() {
  let maxSeats = window.currentGuest.seats;
  let companions = window.tempCompanions || [];

  let html = `
    <div class="screen-content">
      <h2>Confirm Details</h2>
      <p style="font-size:12px; margin-bottom:10px;">Please review your party profile details below:</p>

      <div class="confirm-profile-box" style="width: 100%;">
        <p><b>Main Guest:</b> ${window.currentGuest.name}</p>
        <p><b>Total Seats Reserved:</b> ${maxSeats}</p>
        
        <p style="margin-top: 12px; font-weight: 600;">Companions:</p>
        <ul class="companion-badge-list">
  `;

  if (companions.length > 0) {
    companions.forEach(c => {
      html += `<li>${c}</li>`;
    });
  } else {
    html += `<li style="background: transparent; border: none; padding: 0; font-style: italic; color: #999 !important;">No companions added</li>`;
  }

  html += `
        </ul>
      </div>

      <p style="margin-bottom: 15px; font-weight: 500; color: #4a4a4a; font-size:13px;">Is this information correct?</p>

      <button onclick="pushToHistory(showConfirmScreen); proceedAttendance()">Yes, Everything is Correct</button>
      <button onclick="pushToHistory(showConfirmScreen); showCompanionInputForm()">No, Edit Names</button>
      <button class="back-btn" onclick="handleBack()">← Back</button>
    </div>
  `;

  document.getElementById("screen").innerHTML = html;
}

function proceedAttendance() {
  window.currentGuest.companions = (window.tempCompanions || []).join(", ");
  showAttendanceQuestion();
}

function showAttendanceQuestion() {
  const isSolo = parseInt(window.currentGuest.seats || 1) === 1;
  const yesText = isSolo ? "Yes, I Will Attend" : "Yes, We Will Attend";
  const noText = isSolo ? "Sorry, I Can't Make It" : "Sorry, We Can't Make It";

  let html = `
    <div class="screen-content">
      <h2>Will you attend<br>Anaiah's Onederful Day?</h2>
      <button onclick="finalAttendance('YES')">${yesText}</button>
      <button onclick="finalAttendance('NO')">${noText}</button>
      <button class="back-btn" onclick="handleBack()">← Back</button>
    </div>
  `;

  document.getElementById("screen").innerHTML = html;
}

// FINAL REGISTRATION SUBMISSION (No Back Options Beyond This Point)
async function finalAttendance(answer) {
  try {
    let guest = window.currentGuest;
    window.currentGuest.status = answer; 

    showLoading("Saving your RSVP...");

    let res = await fetch(
      "https://script.google.com/macros/s/AKfycbyIvNFICoN16ta_nxYkCfiWsBHuzZgd8v9emDRmp88TqQXadM9d0_ZpZIQRmzkof6dKMQ/exec",
      {
        method: "POST",
        body: JSON.stringify({
          name: guest.name,
          seats: guest.seats,
          companions: guest.companions,
          status: answer 
        })
      }
    );

    await res.text();
    let cleanRole = guest.role ? guest.role.trim() : "";
    
    if (cleanRole === "Ninong" || cleanRole === "Ninang") {
      showRoleQuestion(cleanRole); 
    } else {
      showSuccessScreen("REGULAR_GUEST");
    }
  } catch (err) {
    console.error(err);
    alert("Unable to save attendance.");
  }
}

function selectAndProceed(labelElement) {
  const radioButton = labelElement.querySelector('input[type="radio"]');
  if (radioButton) {
    radioButton.checked = true;
  }
  setTimeout(() => {
    confirmName();
  }, 180);
}

function showLoading(message = "Loading...") {
  document.getElementById("screen").innerHTML = `
    <div class="loader-container">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

function showRoleQuestion(role) {
  let html = `
    <div class="screen-content">
      <h2>A Special Milestone...</h2>
      <p style="font-size: 14px; color: #4a4a4a; font-weight: 500; margin-bottom: 25px; line-height: 1.6; padding: 0 10px;">
        Do you accept the beloved role of being Anaiah's <b>${role}</b>?
      </p>
      <button onclick="saveRoleResponse('Yes, I Accept')">Yes, I Accept</button>
      <button onclick="saveRoleResponse('Sorry, I Do Not Accept')">Sorry, I Do Not Accept</button>
    </div>
  `;
  document.getElementById("screen").innerHTML = html;
}

async function saveRoleResponse(roleAnswer) {
  try {
    showLoading("Recording your response...");
    await fetch(
      "https://script.google.com/macros/s/AKfycbyIvNFICoN16ta_nxYkCfiWsBHuzZgd8v9emDRmp88TqQXadM9d0_ZpZIQRmzkof6dKMQ/exec",
      {
        method: "POST",
        body: JSON.stringify({
          name: window.currentGuest.name,
          roleConfirmation: roleAnswer 
        })
      }
    );
    showSuccessScreen(roleAnswer);
  } catch (err) {
    console.error(err);
    showSuccessScreen(roleAnswer);
  }
}

function showSuccessScreen(roleAnswer) {
  let messageContent = "";
  const rsvpStatus = window.currentGuest.status;

  if (rsvpStatus === "YES") {
    if (roleAnswer === "Yes, I Accept") {
      messageContent = `
        We are overjoyed that you accepted the role! We can't wait to celebrate <br>
        <span style="font-weight: 600; color: #e02baa; font-size: 15px;">Anaiah's Blooming Birthday</span> with you!
      `;
    } else if (roleAnswer === "Sorry, I Do Not Accept") {
      messageContent = `
        We completely understand! We are still incredibly excited to have you join us and celebrate
        <span style="font-weight: 600; color: #e02baa; font-size: 15px;">Anaiah's Blooming Birthday</span>!
      `;
    } else {
      messageContent = `
        Your RSVP has been confirmed. We can't wait to celebrate <br>
        <span style="font-weight: 600; color: #e02baa; font-size: 15px;">Anaiah's Blooming Birthday</span> with you!
      `;
    }
  } else if (rsvpStatus === "NO") {
    if (roleAnswer === "Yes, I Accept") {
      messageContent = `
        We are deeply honored and overjoyed that you have accepted to be Anaiah's Godparent! <br>
        Even though you can't join us physically at the party, your love, guidance, and blessings mean the world to us.
      `;
    } else {
      messageContent = `
        Thank you for letting us know! Your warm wishes for <span style="font-weight: 600; color: #e02baa;">Anaiah</span> are deeply appreciated. You will be missed!
      `;
    }
  }

  document.getElementById("screen").innerHTML = `
    <div class="screen-content">
      <h2 style="font-size: 26px; color: #dc6700; margin-bottom: 10px;">Thank You!</h2>
      <p style="font-size: 16px; color: #4a4a4a; font-weight: 500; margin-bottom: 20px;">Response Saved.</p>
      <div style="background: rgba(255, 255, 255, 0.4); border-radius: 16px; padding: 20px; border: 1px dashed rgba(0, 0, 0, 0.08); margin-top: 15px; width:100%;">
        <p style="color: #6b6b6b; font-size: 14px; line-height: 1.6; margin: 0;">${messageContent}</p>
      </div>
    </div>
  `;
}
