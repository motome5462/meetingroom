// Assumes div with id="pendingRoomsContainer" and span or element with id="pendingCount" exist

function renderPendingRooms(pendingRooms) {
  const container = document.getElementById('pendingRoomsContainer');
  const pendingCount = document.getElementById('pendingCount');
  container.innerHTML = '';

  if (!pendingRooms || pendingRooms.length === 0) {
    if (pendingCount) pendingCount.textContent = '0';
    container.innerHTML = '<div class="alert alert-success text-center">No pending rooms.</div>';
    return;
  }

  if (pendingCount) pendingCount.textContent = pendingRooms.length;

  pendingRooms.forEach(room => {
    const card = document.createElement('div');
    card.className = 'card mb-3 shadow-sm';

    card.innerHTML = `
      <div class="card-body">
        <h5 class="card-title text-primary">${room.room}</h5>
        <p class="card-text mb-1"><strong>ชื่อผู้จอง:</strong> ${(room.employee && room.employee.name) ? room.employee.name : '-'}</p>
        <p class="card-text mb-1"><strong>วัตถุประสงค์:</strong> ${room.purpose || '-'}</p>
        <p class="card-text mb-1"><strong>วันที่:</strong> ${new Date(room.datetimein).toLocaleDateString()} 
          <strong>เวลา:</strong> ${new Date(room.datetimein).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(room.datetimeout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
        <div class="mt-2">
          <button class="btn btn-success btn-sm" onclick="approveRoom('${room._id}')">อนุมัติ</button>
          <button class="btn btn-danger btn-sm ms-2" onclick="rejectRoom('${room._id}')">ไม่อนุมัติ</button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
}

async function approveRoom(id) {
  try {
    const res = await fetch('/admin/admindashboard/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      removeRoomFromList(id);
    } else {
      const errorData = await res.json();
      alert('อนุมัติไม่สำเร็จ: ' + (errorData.message || 'เกิดข้อผิดพลาด'));
    }
  } catch (error) {
    alert('เกิดข้อผิดพลาดขณะอนุมัติ: ' + error.message);
  }
}

async function rejectRoom(id) {
  try {
    const res = await fetch('/admin/admindashboard/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      removeRoomFromList(id);
    } else {
      const errorData = await res.json();
      alert('ไม่อนุมัติไม่สำเร็จ: ' + (errorData.message || 'เกิดข้อผิดพลาด'));
    }
  } catch (error) {
    alert('เกิดข้อผิดพลาดขณะไม่อนุมัติ: ' + error.message);
  }
}

function removeRoomFromList(id) {
  const idx = pendingRooms.findIndex(r => r._id === id);
  if (idx !== -1) {
    pendingRooms.splice(idx, 1);
    renderPendingRooms(pendingRooms);
  }
}

// Initial call if pendingRooms is defined
if (typeof pendingRooms !== 'undefined') {
  renderPendingRooms(pendingRooms);
}
