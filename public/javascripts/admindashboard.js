async function deleteMeeting(id) {
  if (!confirm('ยืนยันการลบรายการประชุมนี้?')) return;

  try {
    const res = await fetch(`/admin/admindashboard/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      alert('ลบรายการสำเร็จ');
      window.location.reload();
    } else {
      const errorData = await res.json();
      alert('ไม่สามารถลบรายการได้: ' + (errorData.message || 'เกิดข้อผิดพลาด'));
    }
  } catch (error) {
    alert('เกิดข้อผิดพลาดขณะลบ: ' + error.message);
  }
}