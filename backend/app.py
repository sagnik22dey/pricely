from flask import Flask, request, jsonify, session, redirect, url_for, render_template
from dotenv import load_dotenv
import os
from pyngrok import ngrok
from supabase import create_client, Client
import secrets  
from utils.supabase_handler import *

# LOCAL IMPORTS
from utils.main_functions import *

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", secrets.token_hex(16))

@app.route("/send-otp", methods=["POST"])
def send_otp():
    pass

@app.route("/confirm-otp", methods=["POST"])
def confirm_otp():
    pass

@app.route("/login", methods=["POST"])
def login_to_supabase():
    data = request.get_json()
    username = '91' +data.get("phonenumber")
    password = data.get("password")
    if not username or not password:
        return jsonify({"status": "error", "message": "Email and password required"}), 400

    try:
        response = login(number=username, password=password)
        if response['status'] == "success":
            return jsonify({"status": "success", "message": "Login successful"}), 200
        else:
            return jsonify({"status": "error", "message": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/signup", methods=["POST"])
def signup_to_supabase():
    data = request.get_json()
    username = data.get("name")
    password = data.get("password")
    mobile = '91'+data.get("mobile")
    if not username or not password or not mobile:
        return jsonify({"status": "error", "message": "Username, password and mobile required"}), 400
    try:
        res = signup(username=username, password=password, mobile=mobile)
        if res['status'] == "success":
            return jsonify({"status": "success", "message": "Signup successful"}), 200
        else:
            return jsonify({"status": "error", "message": res['message']}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/trending", methods=["POST"])
def get_trending_and_daily_needs():
    return jsonify(tanddn())    
    

@app.route("/get-search-results", methods=["POST"])
def get_search_results():
    data = request.get_json()
    item_name = data.get("item_name")
    lat = data.get("lat")
    lon = data.get("lon")
    credentials = data.get("credentials", {})

    print("credentials",credentials)

    # data = get_compared_results(item_name, lat, lon, credentials)
    data = open("compared_data.json", "r").read()
    data = json.loads(data)

    return jsonify({"status": "success", "data": data})

@app.route("/get-api-key", methods=["POST"])
def get_api_key_route():
    key = get_api_key()
    return jsonify(key)

# --- Admin Routes ---

@app.route("/admin")
def admin_panel():
    if 'admin_username' not in session:
        return redirect(url_for('admin_login'))
    return render_template('admin_panel.html', username=session['admin_username'])

@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if not username or not password:
            return jsonify({"status": "error", "message": "Username and password required"}), 400
        try:
            response = supabase.table('admin_users').select("id, username").eq('username', username).eq('password', password).execute()
            if response.data:
                user = response.data[0]
                session['admin_username'] = user['username']
                return jsonify({"status": "success", "message": "Login successful", "username": user['username']})
            else:
                return jsonify({"status": "error", "message": "Invalid username or password"}), 401
        except Exception as e:
            return render_template('admin_login.html', error="An error occurred during login. Please try again later."), 500
    return render_template('admin_login.html')

@app.route("/admin/verify-session", methods=["POST"])
def verify_admin_session():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"valid": False, "message": "Missing credentials"}), 400
    try:
        response = supabase.table('admin_users').select("id").eq('username', username).eq('password', password).execute()
        if response.data:
            session['admin_username'] = username 
            return jsonify({"valid": True})
        else:
            return jsonify({"valid": False, "message": "Invalid credentials"}), 401 
    except Exception as e:
        return jsonify({"valid": False, "message": "Server error during verification"}), 500

@app.route('/api/offers', methods=['GET'])
def get_offers():
    try:
        response = supabase.table('offers').select("id, image_url, price, created_at").order('created_at', desc=False).execute()
        if response.data:
            return jsonify(response.data)
        else:
            return jsonify([])
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to fetch offers"}), 500

@app.route('/api/offers', methods=['POST'])
def add_offer():
    if 'admin_username' not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json()
    if not data or 'image_url' not in data or 'price' not in data:
        return jsonify({"status": "error", "message": "Missing image_url or price"}), 400
    try:
        image_url = str(data['image_url']).strip()
        price = str(data['price']).strip() # Store price as text as per schema
        if not image_url or not price:
             return jsonify({"status": "error", "message": "Image URL and Price cannot be empty"}), 400
        new_offer_data = {
            "image_url": image_url,
            "price": price
        }
        response = supabase.table('offers').insert(new_offer_data).execute()
        if response.data:
            inserted_offer = response.data[0]
            return jsonify({"status": "success", "message": "Offer added", "offer": inserted_offer}), 201
        else:
            return jsonify({"status": "error", "message": "Failed to add offer to database"}), 500
    except (ValueError, TypeError) as e:
         return jsonify({"status": "error", "message": "Invalid data format"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to save offer"}), 500
    
@app.route('/api/offers/<int:offer_id>', methods=['PUT'])
def update_offer(offer_id):
    if 'admin_username' not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json()
    if not data or 'image_url' not in data or 'price' not in data:
        return jsonify({"status": "error", "message": "Missing image_url or price"}), 400
    try:
        image_url = str(data['image_url']).strip()
        price = str(data['price']).strip() # Store price as text
        if not image_url or not price:
             return jsonify({"status": "error", "message": "Image URL and Price cannot be empty"}), 400
        updated_offer_data = {
            "image_url": image_url,
            "price": price
        }
        response = supabase.table('offers').update(updated_offer_data).eq('id', offer_id).execute()
        if response.data:
            updated_offer = response.data[0] # Get the updated offer data
            return jsonify({"status": "success", "message": f"Offer {offer_id} updated", "offer": updated_offer})
        else:
            check_exists = supabase.table('offers').select('id', count='exact').eq('id', offer_id).execute()
            if check_exists.count == 0:
                 return jsonify({"status": "error", "message": "Offer not found"}), 404
            else:
                 return jsonify({"status": "error", "message": "Failed to update offer in database"}), 500

    except (ValueError, TypeError) as e:
         return jsonify({"status": "error", "message": "Invalid data format"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to update offer"}), 500

@app.route('/api/offers/<int:offer_id>', methods=['DELETE'])
def delete_offer(offer_id):
    if 'admin_username' not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    try:
        response = supabase.table('offers').delete().eq('id', offer_id).execute()
        if response.data:
            deleted_offer_details = response.data[0] # Supabase returns the deleted record
            return jsonify({"status": "success", "message": f"Offer {offer_id} deleted", "deleted_offer": deleted_offer_details})
        else:
            check_exists = supabase.table('offers').select('id', count='exact').eq('id', offer_id).execute()
            if check_exists.count == 0:
                 return jsonify({"status": "error", "message": "Offer not found"}), 404
            else:
                return jsonify({"status": "error", "message": "Failed to delete offer from database"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to delete offer"}), 500

@app.route('/api/bg_image', methods=['GET'])
def get_bg_image():
    try:
        response = supabase.table('bgimage').select("id, image_url").order('created_at', desc=False).execute()
        if response.data:
            return jsonify(response.data)
        else:
            return jsonify([])
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to fetch slideshow items"}), 500



@app.route('/api/daily_needs', methods=['GET'])
def get_daily_needs_items():
    try:
        response = supabase.table('daily_needs').select("id, image_url, price, created_at").order('created_at', desc=False).execute()
        if response.data:
            return jsonify(response.data)
        else:
            return jsonify([])
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to fetch Daily Needs items"}), 500

@app.route('/api/daily_needs', methods=['POST'])
def add_daily_needs_item():
    if 'admin_username' not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json()
    if not data or 'image_url' not in data or 'price' not in data:
        return jsonify({"status": "error", "message": "Missing image_url or price"}), 400
    try:
        image_url = str(data['image_url']).strip()
        price = str(data['price']).strip() # Store price as text
        if not image_url or not price:
             return jsonify({"status": "error", "message": "Image URL and Price cannot be empty"}), 400
        new_item_data = {
            "image_url": image_url,
            "price": price
        }
        response = supabase.table('daily_needs').insert(new_item_data).execute()

        if response.data:
            inserted_item = response.data[0]
            return jsonify({"status": "success", "message": "Daily Needs item added", "item": inserted_item}), 201
        else:
            return jsonify({"status": "error", "message": "Failed to add Daily Needs item to database"}), 500

    except (ValueError, TypeError) as e:
         return jsonify({"status": "error", "message": "Invalid data format"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to save Daily Needs item"}), 500

@app.route('/api/daily_needs/<int:item_id>', methods=['PUT'])
def update_daily_needs_item(item_id):
    if 'admin_username' not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    data = request.get_json()
    if not data or 'image_url' not in data or 'price' not in data:
         return jsonify({"status": "error", "message": "Missing image_url or price"}), 400
    try:
        image_url = str(data['image_url']).strip()
        price = str(data['price']).strip()
        if not image_url or not price:
             return jsonify({"status": "error", "message": "Image URL and Price cannot be empty"}), 400
        updated_item_data = {
            "image_url": image_url,
            "price": price
        }
        response = supabase.table('daily_needs').update(updated_item_data).eq('id', item_id).execute()

        if response.data:
            updated_item = response.data[0]
            return jsonify({"status": "success", "message": f"Daily Needs item {item_id} updated", "item": updated_item})
        else:
            check_exists = supabase.table('daily_needs').select('id', count='exact').eq('id', item_id).execute()
            if check_exists.count == 0:
                 return jsonify({"status": "error", "message": "Daily Needs item not found"}), 404
            else:
                 return jsonify({"status": "error", "message": "Failed to update Daily Needs item in database"}), 500
    except (ValueError, TypeError) as e:
         return jsonify({"status": "error", "message": "Invalid data format"}), 400
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to update Daily Needs item"}), 500
    
@app.route('/api/daily_needs/<int:item_id>', methods=['DELETE'])
def delete_daily_needs_item(item_id):
    if 'admin_username' not in session:
        return jsonify({"status": "error", "message": "Unauthorized"}), 401
    try:
        response = supabase.table('daily_needs').delete().eq('id', item_id).execute()
        if response.data:
            deleted_item_details = response.data[0]
            return jsonify({"status": "success", "message": f"Daily Needs item {item_id} deleted", "deleted_item": deleted_item_details})
        else:
            check_exists = supabase.table('daily_needs').select('id', count='exact').eq('id', item_id).execute()
            if check_exists.count == 0:
                 return jsonify({"status": "error", "message": "Daily Needs item not found"}), 404
            else:
                return jsonify({"status": "error", "message": "Failed to delete Daily Needs item from database"}), 500
    except Exception as e:
        return jsonify({"status": "error", "message": "Failed to delete Daily Needs item"}), 500

def main():
    # kill_ngrok_processes()
    # ngrok.set_auth_token(os.getenv("NGROK_AUTH_TOKEN"))
    # ngrok_tunnel = ngrok.connect(addr='5000', proto="http", hostname="noble-raven-entirely.ngrok-free.app")
    # print("Public URL:", ngrok_tunnel.public_url)
    # app.run(port=5000, debug=True, use_reloader=False) 
    app.run(debug=True)

if __name__ == "__main__":
    main()


# remove the logo in the home page --done
#  so update the name and the location section similer to zepto  name pricely- compare it --done
# add the hamburger menu -- done
# remove the borders from the recent search and keep them small  -- done
# make the recent search logos a little smaller.  -- done

# app opening animation, they will send --(pending as they have not sent yet)
# in the sign in page add a drop shadow to the white section.  -- done
# password hide and show button --done
# instead of the solid pink colour add the gradient colour they provided --done 
# in the searchbar add changing names. like provided --done
# add slider in the home page. --pending
# recommended daily needs also needs a animation  -- done



# web analytics
# edit offer prices from the admin panel -- done
# in the admin panel we need to update slideshow images as well -- done
# the daily needs sections should be updated from the admin panel -- done

# add push notifications as well. -- pending
# normal anaytics --pending



# notes today 4-03-25
# in the header make c and i caps in compare it and add a space after the hiphen.
