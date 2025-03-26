import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const App = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const onDrop = useCallback(acceptedFiles => {
    const selectedFile = acceptedFiles[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      
      const reader = new FileReader();
      reader.onload = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    maxSize: 10485760, // 10MB
    multiple: false
  });

  const handleRecognize = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post('/recognize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setResult({
        text: response.data.text,
        image: response.data.image
      });
      
      // 滚动到结果部分
      setTimeout(() => {
        document.getElementById('result-section')?.scrollIntoView({ 
          behavior: 'smooth' 
        });
      }, 500);
      
    } catch (err) {
      setError(err.response?.data?.error || '识别过程中发生错误');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview('');
    setResult(null);
    setError('');
  };

  const copyToClipboard = () => {
    if (!result?.text) return;
    
    navigator.clipboard.writeText(result.text)
      .then(() => {
        alert('文本已复制到剪贴板！');
      })
      .catch(err => {
        console.error('复制失败:', err);
      });
  };

  const downloadResult = () => {
    if (!result?.text) return;
    
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ocr-result.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <motion.header 
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-primary-600 mb-2">OCR文字识别系统</h1>
        <p className="text-gray-600 text-lg">上传图片，智能识别文字内容</p>
      </motion.header>
      
      <main>
        <motion.div 
          className="mb-12"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex flex-col items-center">
            <AnimatePresence mode="wait">
              {!preview ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={`w-full max-w-2xl h-64 border-2 border-dashed rounded-xl flex flex-col justify-center items-center p-6 mb-6 transition-colors ${
                    isDragActive 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                  }`}
                  {...getRootProps()}
                >
                  <input {...getInputProps()} />
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="text-primary-500 mb-4"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </motion.div>
                  <p className="text-gray-600 text-center">
                    {isDragActive
                      ? "释放图片以上传..."
                      : "拖拽图片到此处，或点击选择图片"}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">支持JPG、PNG等常见图片格式</p>
                </motion.div>
              ) : (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="w-full max-w-2xl mb-6"
                >
                  <div className="bg-white p-4 rounded-xl shadow-md">
                    <div className="relative aspect-video overflow-hidden rounded-lg mb-4">
                      <img 
                        src={preview} 
                        alt="预览图" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-center">
                      <button 
                        onClick={resetForm}
                        className="btn btn-secondary mr-4"
                      >
                        更换图片
                      </button>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleRecognize}
                        disabled={loading}
                        className={`btn ${loading ? 'btn-disabled' : 'btn-primary'}`}
                      >
                        {loading ? (
                          <span className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            处理中...
                          </span>
                        ) : '开始识别'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 w-full max-w-2xl"
              >
                <p className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {error}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
        
        <AnimatePresence>
          {result && (
            <motion.div
              id="result-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <h2 className="text-2xl font-bold text-primary-600 text-center mb-6">识别结果</h2>
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="md:grid md:grid-cols-2 gap-6">
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">原始图片</h3>
                    <div className="rounded-lg overflow-hidden border border-gray-200">
                      <img 
                        src={`data:image/jpeg;base64,${result.image}`} 
                        alt="识别图片" 
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                  <div className="p-6 border-t md:border-t-0 md:border-l border-gray-200">
                    <h3 className="text-lg font-medium text-gray-800 mb-3">识别文本</h3>
                    <div className="mb-4">
                      <textarea
                        value={result.text}
                        readOnly
                        className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-500 resize-none"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={copyToClipboard}
                        className="btn btn-primary flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                        </svg>
                        复制文本
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={downloadResult}
                        className="btn btn-secondary flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        下载结果
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="text-center text-gray-500 text-sm mt-12"
      >
        <p>© {new Date().getFullYear()} OCR文字识别系统 | 基于先进的图像识别技术</p>
      </motion.footer>
    </div>
  );
};

export default App; 