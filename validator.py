import re

def validate_and_correct(data, raw_text):
    """
    Checks if Line Items + Tax == Total.
    """
    print("\n--- 🕵️‍♂️ RUNNING ENGINEERING VALIDATOR ---")
    
    # 1. Map keys safely
    items_list = data.get('line_items', [])
    total_val = data.get('total_amount', 0)
    tax_val = data.get('tax_amount', 0) 
    
    # 2. Calculate Sum
    try:
        items_sum = sum(float(item.get('total_price', 0)) for item in items_list)
        total = float(total_val)
        tax = float(tax_val)
    except (ValueError, TypeError):
        print("⚠️ Data format error. Skipping validation.")
        return data

    # 3. Math Check
    theoretical_total = items_sum + tax
    diff = total - theoretical_total

    print(f"📊 Debug: Items={items_sum:.2f} | Tax={tax:.2f} | AI Total={total:.2f}")

    if abs(diff) < 0.01:
        print("✅ Math Check Passed.")
        return data

    print(f"❌ Math Mismatch! Gap: {diff:.2f}")
    
    # 4. Search for the missing number
    clean_diff = abs(diff)
    # Regex for "72.41" or "72,41"
    pattern = re.escape(str(int(clean_diff))) + r"[.,]\d{2}"
    
    match = re.search(pattern, raw_text)
    
    if match:
        print(f"✨ FOUND IT! Missing value {clean_diff:.2f} found in text.")
        
        if diff > 0:
            print("🔧 Fixing: Inserting missing Tax.")
            data['tax_amount'] = round(diff, 2)
            data['validation_log'] = "Fixed by Engineering Validator (Missing Tax)"
        else:
             print("🔧 Fixing: Inserting missing Discount.")
             data['discount_amount'] = round(abs(diff), 2)
             data['validation_log'] = "Fixed by Engineering Validator (Missed Discount)"
    else:
        print("⚠️ Could not find missing value.")
        data['validation_log'] = "Manual Review Needed"

    return data