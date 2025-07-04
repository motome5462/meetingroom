  function addParticipant() {
    const container = document.getElementById('participantFields');
    const input = document.createElement('input');
    input.type = 'number';
    input.name = 'participants[]';
    input.className = 'form-control mb-2';
    input.placeholder = 'Employee ID';
    container.appendChild(input);
  }