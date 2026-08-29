from flask import Flask, request, jsonify
from flask_cors import CORS
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.edge.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

app = Flask(__name__)
CORS(app)

DEFAULT_URLS = {
    "VU Player": "https://vuproplayer.com/login",
    "IBO Player": "https://iboplayer.com/device/login",
    "IBO Player Pro": "https://iboplayerpro.com/login",
    "BOB Player": "https://bobplayer.com/login",
    "Quick Player": "https://quickplayer.org/login",
    "Clouddy": "https://clouddy.online/login"
}

@app.route('/auto-login', methods=['POST'])
def auto_login():
    data = request.json or {}
    site = data.get('site')
    site_url = data.get('url')
    mac = data.get('mac')
    key = data.get('key')

    if not site or not mac or not key:
        return jsonify({'status': 'error', 'message': 'Dados incompletos fornecidos.'}), 400

    target_url = site_url if site_url else DEFAULT_URLS.get(site)
    
    if not target_url:
        return jsonify({'status': 'error', 'message': f'URL para o site "{site}" não configurada.'}), 400

    try:
        edge_options = Options()
        edge_options.add_argument("--start-maximized")
        edge_options.add_experimental_option("detach", True)

        driver = webdriver.Edge(options=edge_options)
        driver.get(target_url)
        wait = WebDriverWait(driver, 10)
        actions = ActionChains(driver)

        # 1. TRATAMENTO DE POP-UPS E TERMOS LEGAIS (GERAL)
        try:
            popups_xpath = (
                "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accept') "
                "or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'aceitar') "
                "or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'agree') "
                "or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'ok')]"
                " | //a[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accept')]"
            )
            btn_terms = WebDriverWait(driver, 3).until(
                EC.element_to_be_clickable((By.XPATH, popups_xpath))
            )
            btn_terms.click()
            time.sleep(1)
        except Exception:
            pass

        # 2. FLUXO ESPECÍFICO: QUICK PLAYER
        if site == "Quick Player":
            time.sleep(2.0)
            mac_f = wait.until(EC.element_to_be_clickable((By.TAG_NAME, "input")))
            mac_f.clear()
            mac_f.send_keys(mac)
            
            time.sleep(1.5)

            btn_mac = wait.until(EC.presence_of_element_located((By.XPATH, "//button[contains(., 'LOGIN BY MAC')] | //*[contains(text(), 'LOGIN BY MAC')]")))
            driver.execute_script("arguments[0].click();", btn_mac)

            key_f = wait.until(EC.visibility_of_element_located((By.ID, "login_code")))
            time.sleep(1.0)
            key_f.clear()
            key_f.send_keys(key)
            time.sleep(0.5)

            try:
                btn_final = wait.until(EC.presence_of_element_located((
                    By.XPATH, "//button[contains(@class, 'buttonComponent_btn') and .//span[text()='LOGIN']]"
                )))
                driver.execute_script("arguments[0].click();", btn_final)
            except Exception as e:
                print(f"Clique direto no botão falhou, enviando ENTER no campo: {e}")
                key_f.send_keys(Keys.ENTER)

        # 3. FLUXO ESPECÍFICO: VU PLAYER
        elif site == "VU Player":
            time.sleep(2.0)
            inputs = wait.until(EC.presence_of_all_elements_located((By.TAG_NAME, "input")))
            mac_f, key_f = None, None
            
            for i in inputs:
                name_attr = str(i.get_attribute("name") or "").lower()
                placeholder_attr = str(i.get_attribute("placeholder") or "").lower()
                id_attr = str(i.get_attribute("id") or "").lower()
                
                if any(k in name_attr or k in placeholder_attr or k in id_attr for k in ["mac", "user"]):
                    mac_f = i
                if any(k in name_attr or k in placeholder_attr or k in id_attr for k in ["key", "pass"]):
                    key_f = i

            if mac_f and key_f:
                mac_f.clear()
                mac_f.send_keys(mac)
                key_f.clear()
                key_f.send_keys(key)
                time.sleep(0.5)
                key_f.send_keys(Keys.ENTER)

        # 4. FLUXO ESPECÍFICO: IBO PLAYER E BOB PLAYER (MESMA LÓGICA - PREENCHE E AGUARDA MANUAMENTE)
        elif site in ["IBO Player", "BOB Player"]:
            time.sleep(2.0)
            
            # 1. Remover Pop-ups e Aceitar Termos (Forçado via JS)
            driver.execute_script("""
                document.querySelectorAll('.modal-backdrop, .modal, #cookie-consent').forEach(el => el.remove());
                document.body.classList.remove('modal-open');
                
                let btns = Array.from(document.querySelectorAll('button, a'));
                btns.forEach(b => {
                    let txt = b.innerText.toLowerCase();
                    if(txt.includes('accept') || txt.includes('agree') || txt.includes('ok')){
                        b.click();
                    }
                });
            """)
            time.sleep(1.0)

            try:
                # 2. Localizar MAC (max-address ou placeholder MAC)
                try:
                    mac_f = wait.until(EC.element_to_be_clickable((By.ID, "max-address")))
                except Exception:
                    mac_f = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder*='MAC']")))

                # 3. Localizar KEY (device-key ou placeholder Key)
                try:
                    key_f = wait.until(EC.element_to_be_clickable((By.ID, "device-key")))
                except Exception:
                    key_f = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "input[placeholder*='Key']")))

                # 4. Scroll até o elemento
                driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", mac_f)
                time.sleep(0.5)

                # 5. Preencher dados (sem submeter botão devido a validações/captcha)
                mac_f.clear()
                mac_f.send_keys(mac)
                time.sleep(0.5)
                key_f.clear()
                key_f.send_keys(key)

            except Exception as e:
                print(f"Erro ao localizar campos do {site}: {e}")
                raise e

        # 5. FLUXO ESPECÍFICO: IBO PLAYER PRO
        elif site == "IBO Player Pro":
            time.sleep(2.0)
            mac_f = wait.until(EC.element_to_be_clickable((By.ID, "mac_address")))
            key_f = wait.until(EC.element_to_be_clickable((By.ID, "password")))
            
            mac_f.clear()
            mac_f.send_keys(mac)
            key_f.clear()
            key_f.send_keys(key)
            time.sleep(1.0)
            
            try:
                btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
                actions.move_to_element(btn).click().perform()
            except Exception:
                driver.execute_script("document.querySelector(\"button[type='submit']\").click();")

        # 6. FLUXO PADRÃO PARA OUTROS SITES (Clouddy, etc)
        else:
            try:
                mac_xpath = (
                    "//input[@id='mac' or @id='mac_address' or @name='mac' or @name='mac_address' "
                    "or @name='username' or contains(@placeholder, 'MAC') or contains(@placeholder, 'mac')]"
                )
                mac_field = wait.until(EC.presence_of_element_located((By.XPATH, mac_xpath)))
                mac_field.clear()
                mac_field.send_keys(mac)
            except Exception as e:
                print(f"Erro ao preencher MAC: {e}")

            try:
                key_xpath = (
                    "//input[@id='key' or @id='device_key' or @name='key' or @name='device_key' "
                    "or @name='password' or @type='password' or contains(@placeholder, 'KEY') or contains(@placeholder, 'key')]"
                )
                key_field = driver.find_element(By.XPATH, key_xpath)
                key_field.clear()
                key_field.send_keys(key)
            except Exception as e:
                print(f"Erro ao preencher KEY: {e}")

            time.sleep(1)
            try:
                submit_xpath = (
                    "//button[@type='submit'] "
                    "| //input[@type='submit'] "
                    "| //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'login')] "
                    "| //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'entrar')] "
                    "| //button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'submit')]"
                )
                submit_btn = driver.find_element(By.XPATH, submit_xpath)
                driver.execute_script("arguments[0].click();", submit_btn)
            except Exception as e:
                print(f"Aviso: Não foi possível clicar no botão de submit automaticamente: {e}")

        return jsonify({'status': 'success', 'message': f'Automação executada para {site}!'})

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    print("=" * 60)
    print(" ⚡ SERVIDOR DE AUTOMAÇÃO AUTOLOG APPS RODANDO NA PORTA 5000")
    print("=" * 60)
    app.run(host='127.0.0.1', port=5000, debug=True)