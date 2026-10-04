import streamlit as st
import streamlit.components.v1 as components
import os

# Cấu hình trang mở rộng toàn màn hình
st.set_page_config(layout="wide", page_title="Hệ thống Mô phỏng")

st.title("Tổng hợp các Mô phỏng bằng Streamlit")

# Tạo 3 Tabs trong Streamlit
tab1, tab2, tab3 = st.tabs(["🍳 Mô phỏng Cooking", "🍺 Mô phỏng Drunk", "🛢️ Mô phỏng Oil"])

# Hàm dùng để đọc và hiển thị file HTML
def load_local_html(file_name):
    # Lấy đường dẫn tuyệt đối của thư mục chứa file py này
    current_dir = os.path.dirname(__file__)
    file_path = os.path.join(current_dir, file_name)
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_data = f.read()
            # Hiển thị HTML trong streamlit với chiều cao 800px, có cho phép cuộn
            components.html(html_data, height=800, scrolling=True)
    except FileNotFoundError:
        st.error(f"❌ Không tìm thấy file `{file_name}`. Vui lòng đảm bảo file HTML của bạn nằm cùng thư mục với file Python này và đúng tên.")

# Hiển thị nội dung vào từng Tab
with tab1:
    st.header("Mô phỏng Cooking")
    # Thay tên file tại đây nếu file HTML của bạn có tên khác
    load_local_html('cooking.html')

with tab2:
    st.header("Mô phỏng Drunk")
    # Thay tên file tại đây
    load_local_html('drunk.html')

with tab3:
    st.header("Mô phỏng Oil")
    # Thay tên file tại đây
    load_local_html('oil.html')
