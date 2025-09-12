async function cancelMeeting(id) {
  if (!confirm('Are you sure you want to cancel this meeting?')) return;

  try {
    const res = await fetch(`/user/dashboard/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      alert('Meeting cancelled successfully');
      window.location.reload();
    } else {
      const errorData = await res.json();
      alert('Failed to cancel meeting: ' + (errorData.message || 'An error occurred'));
    }
  } catch (error) {
    alert('Error cancelling meeting: ' + error.message);
  }
}

async function deleteMeeting(id) {
    if (!confirm('Are you sure you want to delete this meeting?')) return;

    try {
      const res = await fetch(`/user/dashboard/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        alert('Meeting deleted successfully');
        window.location.reload();
      } else {
        const errorData = await res.json();
        alert('Failed to delete meeting: ' + (errorData.message || 'An error occurred'));
      }
    } catch (error) {
      alert('Error deleting meeting: ' + error.message);
    }
  }
function showMoreRooms(room, btn) {
  const items = document.querySelectorAll('.extra-' + room);
  items.forEach(el => el.classList.remove('d-none'));
  if (btn) btn.style.display = 'none';
}