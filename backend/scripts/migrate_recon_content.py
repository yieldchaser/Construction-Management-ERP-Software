import os
import re
import json
import urllib.request
from urllib.parse import urlparse
from bs4 import BeautifulSoup, NavigableString

# Define paths
recon_dir = r"c:\Users\Dell\Github\Construction-Management-ERP-Software\onsiteteams-recon"
pages_dir = os.path.join(recon_dir, "pages")
frontend_content_dir = r"c:\Users\Dell\Github\Construction-Management-ERP-Software\frontend\src\content"
public_images_dir = r"c:\Users\Dell\Github\Construction-Management-ERP-Software\frontend\public\images\recon"

# Clean up and recreate directories
import shutil
os.makedirs(frontend_content_dir, exist_ok=True)
os.makedirs(public_images_dir, exist_ok=True)
for sub in ["help", "blog", "products", "resources", "pages"]:
    dir_path = os.path.join(frontend_content_dir, sub)
    if os.path.exists(dir_path):
        shutil.rmtree(dir_path)
    os.makedirs(dir_path, exist_ok=True)

# Rephrase mapping
phrase_replacements = [
    (r'\bhow to create\b', 'steps to set up'),
    (r'\bHow to create\b', 'Steps to set up'),
    (r'\bHow to Create\b', 'Steps to Set Up'),
    (r'\bhow to add\b', 'steps to include'),
    (r'\bHow to add\b', 'Steps to include'),
    (r'\bHow to Add\b', 'Steps to Include'),
    (r'\bhow to use\b', 'guide to using'),
    (r'\bHow to use\b', 'Guide to using'),
    (r'\bHow to Use\b', 'Guide to Using'),
    (r'\bhow to configure\b', 'steps to configure'),
    (r'\bHow to configure\b', 'Steps to configure'),
    (r'\bHow to Configure\b', 'Steps to Configure'),
    (r'\bhow to manage\b', 'managing'),
    (r'\bHow to manage\b', 'Managing'),
    (r'\bHow to Manage\b', 'Managing'),
    (r'\bhow to set up\b', 'setting up'),
    (r'\bHow to set up\b', 'Setting up'),
    (r'\bHow to Set Up\b', 'Setting Up'),
    (r'\bbefore you start\b', 'prerequisites'),
    (r'\bBefore you start\b', 'Prerequisites'),
    (r'\bBefore You Start\b', 'Prerequisites'),
    (r'\bwhy use\b', 'benefits of using'),
    (r'\bWhy use\b', 'Benefits of using'),
    (r'\bWhy Use\b', 'Benefits of Using'),
    (r'\bin this article\b', 'in this guide'),
    (r'\bIn this article\b', 'in this guide'),
    (r'\bIn this Article\b', 'in this guide'),
    (r'\bto do this\b', 'to achieve this'),
    (r'\bTo do this\b', 'to achieve this'),
    (r'\bstandard practice in India\b', 'common industry standard'),
    (r'\bStandard practice in India\b', 'Common industry standard'),
    (r'\bconfirm with your CA\b', 'consult your accountant or financial advisor'),
    (r'\bConfirm with your CA\b', 'Consult your accountant or financial advisor'),
    (r'\bclick settings in the left sidebar\b', 'navigate to Settings from the sidebar'),
    (r'\bClick settings in the left sidebar\b', 'Navigate to Settings from the sidebar'),
    (r'\bClick Settings in the left sidebar\b', 'Navigate to Settings from the sidebar'),
    (r'\bfor more information\b', 'to learn more'),
    (r'\bFor more information\b', 'to learn more'),
    (r'\bFor More Information\b', 'to learn more'),
    (r'\bthis guide shows you\b', 'this tutorial explains'),
    (r'\bThis guide shows you\b', 'this tutorial explains'),
    (r'\bThis Guide Shows You\b', 'this tutorial explains'),
]

def rephrase_text(text):
    if not text:
        return text
        
    # Competitor Brand replacements (case-insensitive)
    text = re.sub(r'onsite-teams\.com', 'siteflow.com', text, flags=re.IGNORECASE)
    text = re.sub(r'onsiteteams\.com', 'siteflow.com', text, flags=re.IGNORECASE)
    text = re.sub(r'\bonsite-teams\b', 'SiteFlow', text, flags=re.IGNORECASE)
    text = re.sub(r'\bonsite teams\b', 'SiteFlow', text, flags=re.IGNORECASE)
    text = re.sub(r'\bonsiteteams\b', 'SiteFlow', text, flags=re.IGNORECASE)
    text = re.sub(r'\bonsite\'s\b', "SiteFlow's", text, flags=re.IGNORECASE)
    text = re.sub(r'\bonsites\b', 'SiteFlow', text, flags=re.IGNORECASE)
    text = re.sub(r'\bonsite\b', 'SiteFlow', text, flags=re.IGNORECASE)
    
    # Run exact replacements
    for pattern, replacement in phrase_replacements:
        text = re.sub(pattern, replacement, text)
        
    return text

def download_image(url):
    """
    Downloads image from url and saves it locally in public_images_dir.
    Returns the public path for the image (e.g. /images/recon/filename.png)
    """
    if not url or not url.startswith("http"):
        return url
    
    # Extract filename
    parsed = urlparse(url)
    filename = os.path.basename(parsed.path)
    if not filename:
        return url
        
    local_path = os.path.join(public_images_dir, filename)
    public_path = f"/images/recon/{filename}"
    
    if os.path.exists(local_path):
        return public_path # already downloaded
        
    try:
        # download
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            with open(local_path, 'wb') as out_f:
                out_f.write(response.read())
        print(f"Downloaded image: {filename}")
        return public_path
    except Exception as e:
        # print error but return original URL or placeholder
        print(f"Failed to download image {url}: {e}")
        return url

# Define page category maps based on prefix
special_pages = {
    'about_': 'pages',
    'contact_': 'pages',
    'privacy_': 'pages',
    'terms_': 'pages',
    'who-we-serve_': 'pages',
    'integrations_': 'pages',
    'brand-collaboration_': 'pages',
    'career_': 'pages',
    'channel-partner-program_': 'pages',
    'middle-east-clients_': 'pages',
    'onsite-pricing_': 'pages',
    'thank-you-page_': 'pages',
    'index.html': 'pages',
    'webapp-home.html': 'pages',
    'webapp-login.html': 'pages',
    'blog_.html': 'pages',
    'help_.html': 'pages',
    'products_.html': 'pages',
    'resources_.html': 'pages',
}

files = os.listdir(pages_dir)
processed_count = 0

print(f"Starting processing of {len(files)} files...")

for f in files:
    if not f.endswith(".html"):
        continue
        
    file_path = os.path.join(pages_dir, f)
    
    # Determine type
    content_type = "blog" # default
    category = None
    slug = ""
    
    # Standardize filename to slug base
    name = f[:-5]
    if name.endswith("_"):
        name = name[:-1]
        
    # Check if special page
    is_special = False
    for sp_key, sp_type in special_pages.items():
        if f == sp_key or f.startswith(sp_key):
            content_type = sp_type
            is_special = True
            slug = name.replace("_", "/")
            break
            
    if not is_special:
        if f.startswith("help_"):
            content_type = "help"
            # Extract category and remaining slug
            # e.g., help_attendance-payroll_how-to-create-salary-template_
            parts = name.split("_")
            # parts[0] is 'help'
            if len(parts) > 1:
                category = parts[1]
                slug = "/".join(parts[1:])
            else:
                slug = "general"
        elif f.startswith("products_"):
            content_type = "products"
            parts = name.split("_")
            slug = "/".join(parts[1:])
        elif f.startswith("resources_"):
            content_type = "resources"
            parts = name.split("_")
            slug = "/".join(parts[1:])
        else:
            content_type = "blog"
            slug = name.replace("_", "/")

    # Read HTML file
    try:
        with open(file_path, 'r', encoding='utf-8') as html_file:
            soup = BeautifulSoup(html_file.read(), 'lxml')
    except Exception as e:
        print(f"Error reading file {f}: {e}")
        continue

    # Extract metadata
    title_tag = soup.find('title')
    title = title_tag.get_text(strip=True) if title_tag else name.replace("_", " ").title()
    title = rephrase_text(title)
    
    meta_desc_tag = soup.find('meta', attrs={'name': 'description'})
    meta_description = meta_desc_tag.get('content', '') if meta_desc_tag else ""
    meta_description = rephrase_text(meta_description)
    
    canonical_tag = soup.find('link', rel='canonical')
    canonical = canonical_tag.get('href', '') if canonical_tag else ""
    canonical = rephrase_text(canonical)
    
    # Extract Author & Date
    author_tag = soup.find('meta', attrs={'name': 'author'})
    author = author_tag.get('content', 'SiteFlow Operations Team') if author_tag else 'SiteFlow Operations Team'
    
    date_tag = soup.find('meta', property='article:published_time') or soup.find('meta', property='article:modified_time')
    publish_date = date_tag.get('content', '2026-06-26') if date_tag else '2026-06-26'
    
    # Find clean content
    # Remove forms, tables of contents, Blocksy layout blocks, and scripts
    for clean_el in soup.find_all(['script', 'style', 'noscript', 'form']):
        clean_el.decompose()
        
    toc = soup.find(id='ez-toc-container') or soup.find(class_='ez-toc-container')
    if toc:
        toc.decompose()
        
    # Extract main content container
    entry_contents = soup.find_all(class_='entry-content')
    valid_contents = []
    for ec in entry_contents:
        classes = ec.get('class', [])
        if 'ct-popup-content' not in classes and 'popup' not in classes:
            valid_contents.append(ec)
            
    if valid_contents:
        content_element = max(valid_contents, key=lambda x: len(x.get_text()))
    else:
        content_element = soup.find('article') or soup.find(class_='content') or soup.find(class_='wp-block-post-content')
        if not content_element:
            content_element = soup.body if soup.body else soup
        
    if not content_element:
        print(f"Warning: No content container found in {f}, skipping body.")
        html_body = ""
    else:
        # Walk through text nodes and apply rephrase
        for node in content_element.find_all(text=True):
            if isinstance(node, NavigableString) and node.parent.name not in ['script', 'style']:
                new_text = rephrase_text(node.string)
                node.replace_with(new_text)
                
        # Clean image tags and download images
        for img in content_element.find_all('img'):
            # Download src
            src = img.get('src')
            if src:
                local_src = download_image(src)
                img['src'] = rephrase_text(local_src)
            # Clear layout specific srcset and sizes
            if img.has_attr('srcset'):
                del img['srcset']
            if img.has_attr('sizes'):
                del img['sizes']
            if img.has_attr('alt'):
                img['alt'] = rephrase_text(img['alt'])
                
        # Clean links
        for a in content_element.find_all('a'):
            href = a.get('href', '')
            if href:
                a['href'] = rephrase_text(href)
                
        # Extract HTML body from element
        html_body = content_element.encode_contents().decode('utf-8')

    # Prepare JSON structure
    post_data = {
        "title": title,
        "metaTitle": title,
        "metaDescription": meta_description,
        "canonical": canonical,
        "slug": slug,
        "category": category,
        "type": content_type,
        "author": author,
        "publishDate": publish_date,
        "body": html_body
    }
    
    # Rephrase the entire structure by converting to JSON string, rephrasing, and parsing back
    json_str = json.dumps(post_data, ensure_ascii=False)
    json_str_rephrased = rephrase_text(json_str)
    post_data = json.loads(json_str_rephrased)
    
    # Extract rephrased fields for file paths
    final_slug = post_data.get("slug", slug)
    final_category = post_data.get("category", category)
    
    # Save file
    target_dir = os.path.join(frontend_content_dir, content_type)
    if final_category:
        target_dir = os.path.join(target_dir, final_category)
        
    os.makedirs(target_dir, exist_ok=True)
    
    # Extract filename from slug
    slug_filename = final_slug.split("/")[-1] if "/" in final_slug else final_slug
    if not slug_filename or slug_filename == "":
        slug_filename = "index"
        
    target_file_path = os.path.join(target_dir, f"{slug_filename}.json")
    
    try:
        with open(target_file_path, 'w', encoding='utf-8') as out_json:
            json.dump(post_data, out_json, indent=2, ensure_ascii=False)
        processed_count += 1
    except Exception as e:
        print(f"Error writing json {target_file_path}: {e}")

print(f"Migration completed! Processed {processed_count} files successfully.")
