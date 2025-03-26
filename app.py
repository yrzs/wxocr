from flask import Flask, render_template, request, jsonify
import os
import main  # 导入您现有的OCR程序
from PIL import Image
import io
import base64

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 限制上传大小为16MB

# 确保上传文件夹存在
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/recognize', methods=['POST'])
def recognize():
    if 'file' not in request.files:
        return jsonify({'error': '没有文件上传'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    
    # 保存上传的文件
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(file_path)
    
    # 调用OCR识别函数
    try:
        result = main.recognize_text(file_path)
        
        # 将图像转换为base64以在前端显示
        with open(file_path, 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        # 提取识别文本
        text_results = []
        if isinstance(result, dict) and 'ocr_response' in result:
            for item in result['ocr_response']:
                text_results.append({
                    'text': item['text'],
                    'confidence': item['rate'],
                    'box': {
                        'left': item['left'],
                        'top': item['top'],
                        'right': item['right'],
                        'bottom': item['bottom']
                    }
                })
        
        return jsonify({
            'success': True,
            'text': result,  # 返回完整结果
            'textResults': text_results,  # 提取的文本结果
            'image': img_data,
            'imageWidth': result.get('width', 0),
            'imageHeight': result.get('height', 0)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # 处理完成后删除临时文件
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
        except:
            pass

if __name__ == '__main__':
    app.run(debug=True) 