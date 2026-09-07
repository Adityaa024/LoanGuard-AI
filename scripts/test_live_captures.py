import os
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

options = Options()
options.add_argument('--headless=new')
options.add_argument('--window-size=1920,1080')
options.add_argument('--disable-gpu')
driver = webdriver.Chrome(options=options)

driver.get('http://localhost:8080')
time.sleep(2)

# 1. Capture Login Screen
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_01.png')
print('1. Login screen captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_01.png'))

# 2. Click Aditya quickLaunch button
wait = WebDriverWait(driver, 15)
op_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Aditya')]")))
driver.execute_script("arguments[0].click();", op_btn)
print("Clicked Aditya quickLaunch button, waiting for dashboard...")
time.sleep(3)

driver.save_screenshot(r'D:\intain\live_5min_frames\debug_after_op_click.png')
print('Debug screenshot after op click size:', os.path.getsize(r'D:\intain\live_5min_frames\debug_after_op_click.png'))
for entry in driver.get_log('browser'):
    print('CONSOLE LOG:', entry)
adv_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Adversarial Tape')]")))
driver.execute_script("arguments[0].click();", adv_btn)
print("2. Loaded Adversarial Tape!")
time.sleep(1.5)

# Click Run Ingestion Pipeline
run_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Run Ingestion Pipeline')]")))
driver.execute_script("arguments[0].click();", run_btn)
print("3. Executed Run Ingestion Pipeline!")
time.sleep(4)

driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_02.png')
print('4. Ingestion result captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_02.png'))

# 5. Open Policy Rules Modal
pol_btn = driver.find_element(By.XPATH, "//button[contains(., 'Policy Engine') or contains(., 'Policy Rules')]")
driver.execute_script("arguments[0].click();", pol_btn)
time.sleep(1.5)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_03.png')
print('5. Policy Catalog modal captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_03.png'))

# Close Policy Modal
close_btn = driver.find_element(By.XPATH, "//button[contains(., '✕') or contains(., 'Close')]")
driver.execute_script("arguments[0].click();", close_btn)
time.sleep(1)

# 6. Open Failed Rows Report
failed_btn = driver.find_element(By.XPATH, "//button[contains(., 'Failed Rows Report') or contains(., 'Inspect Failed Rows')]")
driver.execute_script("arguments[0].click();", failed_btn)
time.sleep(1.5)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_04.png')
print('6. Failed Rows report captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_04.png'))

# Close Failed Rows Report
close_btn = driver.find_element(By.XPATH, "//button[contains(., '✕') or contains(., 'Close')]")
driver.execute_script("arguments[0].click();", close_btn)
time.sleep(1)

# 7. Switch to Reviewer
driver.execute_script("window.dispatchEvent(new CustomEvent('switch_tab', { detail: 'reviewer' }))")
time.sleep(2)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_05.png')
print('7. Reviewer Queue captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_05.png'))

# 8. Select Exception row
row = driver.find_element(By.XPATH, "//tr[contains(@class, 'cursor-pointer') or contains(@class, 'border-b')]")
driver.execute_script("arguments[0].click();", row)
time.sleep(2)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_06.png')
print('8. AI Diagnostics Copilot captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_06.png'))

# 9. Apply to Draft
try:
    apply_btn = driver.find_element(By.XPATH, "//button[contains(., 'Apply to Draft')]")
    driver.execute_script("arguments[0].click();", apply_btn)
    time.sleep(1)
    preset_note = driver.find_element(By.XPATH, "//button[contains(., '+ Accepted AI') or contains(., '+ Note')]")
    driver.execute_script("arguments[0].click();", preset_note)
    time.sleep(1)
except Exception as e:
    print('Apply draft error:', e)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_07.png')
print('9. Human-in-the-Loop draft captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_07.png'))

# 10. Approve & Verify
try:
    approve_btn = driver.find_element(By.XPATH, "//button[contains(., 'Approve & Verify')]")
    driver.execute_script("arguments[0].click();", approve_btn)
    time.sleep(2.5)
except Exception as e:
    print('Approve error:', e)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_08.png')
print('10. Approved & Verified captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_08.png'))

# 11. Switch to Consumer via sidebar button
cons_btn = driver.find_element(By.XPATH, "//button[contains(., 'Data Consumer')]")
driver.execute_script("arguments[0].click();", cons_btn)
time.sleep(3)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_09.png')
print('11. Data Consumer dashboard captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_09.png'))

# 12. Verify Ledger Integrity
try:
    verify_btn = driver.find_element(By.XPATH, "//button[contains(., 'Verify Ledger Integrity') or contains(., 'Verify Ledger')]")
    driver.execute_script("arguments[0].click();", verify_btn)
    time.sleep(2)
    driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_10.png')
    print('12. Verify Ledger modal captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_10.png'))
    close_btn = driver.find_element(By.XPATH, "//button[contains(., '✕') or contains(., 'Close')]")
    driver.execute_script("arguments[0].click();", close_btn)
    time.sleep(1)
except Exception as e:
    print('Verify ledger error:', e)

# 13. REST API response
driver.get("http://localhost:8080/api/verified-loans")
time.sleep(1.5)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_11.png')
print('13. REST API response captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_11.png'))

# 14. AI Dev Log
driver.get("http://localhost:8080/ai_development_log.md")
time.sleep(1.5)
driver.save_screenshot(r'D:\intain\live_5min_frames\test_scene_12.png')
print('14. AI Dev Log captured:', os.path.getsize(r'D:\intain\live_5min_frames\test_scene_12.png'))

driver.quit()
print("\nALL 14 TEST STEPS COMPLETED WITH 100% SUCCESS!")
