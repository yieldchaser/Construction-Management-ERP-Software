import requests
import sys

BASE_URL = "http://localhost:8000/apis/v3"

def run_tests():
    print("Starting Competitor Parity Backend API Tests...")
    
    # 1. Verify Project & Employees
    proj_id = "d0000000-0000-0000-0000-000000000001"
    emp_id = "e0000000-0000-0000-0000-000000000100"
    
    print("\n--- 1. Fetching Employees ---")
    emp_res = requests.get(f"{BASE_URL}/hr/employees/{proj_id}")
    if emp_res.status_code != 200:
        print(f"Failed to fetch employees. Status: {emp_res.status_code}")
        print(emp_res.text)
        sys.exit(1)
    
    employees = emp_res.json()
    print(f"Employees list fetched. Found {len(employees)} employees.")
    if len(employees) > 0:
        emp_id = employees[0]['id']
        print(f"Using employee: {employees[0]['name']} (ID: {emp_id})")

    # 2. Punch IN with shift multiplier & geofence flags
    print("\n--- 2. Recording GPS Punch IN ---")
    punch_in_payload = {
        "employee_id": emp_id,
        "project_id": proj_id,
        "lat": 12.9716,
        "lng": 77.5946,
        "punch_type": "in",
        "shift_multiplier": 0.36,
        "location_verified": False,
        "notes": "Offsite check-in test"
    }
    punch_res = requests.post(f"{BASE_URL}/hr/attendance/punch", json=punch_in_payload)
    if punch_res.status_code not in (200, 201):
        if "Already punched in today" in punch_res.text:
            print("Already punched in today. Proceeding...")
        else:
            print(f"Punch IN failed. Status: {punch_res.status_code}")
            print(punch_res.text)
            sys.exit(1)
    else:
        punch_log = punch_res.json()
        print(f"Punch IN recorded. Shift Multiplier: {punch_log['shift_multiplier']}, Location Verified: {punch_log['location_verified']}")
        assert punch_log['shift_multiplier'] == 0.36
        assert punch_log['location_verified'] is False

    # 3. Subcontractor attendance logs
    print("\n--- 3. Subcontractor Crew Attendance ---")
    subcon_id = "e0000000-0000-0000-0000-000000000100" 
    subcon_payload = {
        "project_id": proj_id,
        "subcontractor_id": subcon_id,
        "attendance_date": "2026-06-30T10:00:00Z",
        "labor_role": "Mason",
        "worker_count": 12,
        "shift_multiplier": 1.25,
        "overtime_hours": 2.5,
        "allowance": 500.0,
        "deduction": 50.0,
        "notes": "Krishna masonry crew",
        "photo_url": "http://example.com/crew.jpg"
    }
    
    subcon_res = requests.post(f"{BASE_URL}/subcon/attendance", json=subcon_payload)
    if subcon_res.status_code not in (200, 201):
        print(f"Failed to log subcontractor crew attendance. Status: {subcon_res.status_code}")
        print(subcon_res.text)
        sys.exit(1)
    subcon_log = subcon_res.json()
    print(f"Subcontractor crew attendance saved. Role: {subcon_log['labor_role']}, Count: {subcon_log['worker_count']}, Allowance: {subcon_log['allowance']}")
    assert subcon_log['worker_count'] == 12
    assert subcon_log['shift_multiplier'] == 1.25
    assert float(subcon_log['allowance']) == 500.0

    print("\n--- 4. Fetch Subcontractor logs for Date ---")
    subcon_get = requests.get(f"{BASE_URL}/subcon/attendance/{proj_id}/2026-06-30")
    if subcon_get.status_code != 200:
        print(f"Failed to fetch subcontractor attendance. Status: {subcon_get.status_code}")
        print(subcon_get.text)
        sys.exit(1)
    subcon_list = subcon_get.json()
    print(f"Subcontractor attendance list retrieved. Count: {len(subcon_list)}")
    assert len(subcon_list) >= 1
    assert subcon_list[0]['labor_role'] == "Mason"

    # 4. WBS tasks list and detail feeds
    print("\n--- 5. Fetch WBS Tasks ---")
    tasks_res = requests.get(f"{BASE_URL}/planning/tasks?project_id={proj_id}")
    if tasks_res.status_code != 200:
        print(f"Failed to fetch WBS tasks. Status: {tasks_res.status_code}")
        print(tasks_res.text)
        sys.exit(1)
    tasks = tasks_res.json()
    print(f"Tasks retrieved. Count: {len(tasks)}")
    
    if len(tasks) == 0:
        print("Creating a dummy WBS task to complete feed tests...")
        task_create_payload = {
            "project_id": proj_id,
            "name": "Site Clearing & Earthworks",
            "duration_days": 10,
            "start_date": "2026-06-30T08:00:00Z",
            "priority": "high"
        }
        task_res = requests.post(f"{BASE_URL}/planning/tasks", json=task_create_payload)
        task_obj = task_res.json()
    else:
        task_obj = tasks[0]
    
    task_id = task_obj['id']
    print(f"Testing with WBS Task: {task_obj['name']} (ID: {task_id})")

    # 5. Checklist subtask todos
    print("\n--- 6. Task Sub-task Todo Checklist ---")
    todo_res = requests.post(f"{BASE_URL}/planning/tasks/{task_id}/todos", json={"title": "Clear North Excavation Area"})
    if todo_res.status_code not in (200, 201):
        print(f"Failed to create subtask todo. Status: {todo_res.status_code}")
        print(todo_res.text)
        sys.exit(1)
    todo = todo_res.json()
    print(f"Sub-task todo created: '{todo['title']}', Completed: {todo['is_completed']}")
    assert todo['is_completed'] is False
    
    toggle_res = requests.patch(f"{BASE_URL}/planning/tasks/todos/{todo['id']}/toggle")
    todo_toggled = toggle_res.json()
    print(f"Sub-task todo toggled is_completed: {todo_toggled['is_completed']}")
    assert todo_toggled['is_completed'] is True

    # 6. Task Activity Comments Feed
    print("\n--- 7. WBS Task Activity Feed & Progress Logging ---")
    comment_payload = {
        "user_id": subcon_id,
        "user_name": "Vikram Joshi (Site Engineer)",
        "message_text": "Completed concrete casting for Grid A-C",
        "progress_qty_added": 45.5,
        "voice_note_url": "http://example.com/audio-rec.mp3"
      }
    comment_res = requests.post(f"{BASE_URL}/planning/tasks/{task_id}/comments", json=comment_payload)
    if comment_res.status_code not in (200, 201):
        print(f"Comment creation failed. Status: {comment_res.status_code}")
        print(comment_res.text)
        sys.exit(1)
    comment = comment_res.json()
    print(f"Task comment/activity logged. Msg: '{comment['message_text']}', Progress Logged: {comment['progress_qty_added']}, Audio Note: {comment['voice_note_url']}")
    assert comment['progress_qty_added'] == 45.5
    assert comment['voice_note_url'] == "http://example.com/audio-rec.mp3"

    print("\nALL COMPETITOR PARITY ENDPOINTS TESTED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
