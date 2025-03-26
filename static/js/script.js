document.addEventListener('DOMContentLoaded', function() {
    // 设置当前年份
    document.getElementById('current-year').textContent = new Date().getFullYear();
    
    // 获取DOM元素
    const fileInput = document.getElementById('file-input');
    const dropArea = document.getElementById('drop-area');
    const uploadForm = document.getElementById('upload-form');
    const previewContainer = document.getElementById('preview-container');
    const previewImage = document.getElementById('preview-image');
    const changeImageBtn = document.getElementById('change-image');
    const recognizeBtn = document.getElementById('recognize-btn');
    const resultSection = document.getElementById('result-section');
    const resultImage = document.getElementById('result-image');
    const resultTextArea = document.getElementById('result-text-area');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    // 初始状态下禁用识别按钮并确保加载蒙版和错误消息区域隐藏
    recognizeBtn.disabled = true;
    loadingOverlay.hidden = true;
    errorMessage.hidden = true;
    
    // 拖放功能
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        const fileLabel = dropArea.querySelector('.file-label');
        if (fileLabel) {
            fileLabel.classList.add('highlight');
        }
    }

    function unhighlight() {
        const fileLabel = dropArea.querySelector('.file-label');
        if (fileLabel) {
            fileLabel.classList.remove('highlight');
        }
    }

    // 处理拖放上传
    dropArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            fileInput.files = files;
            handleFiles(files);
        }
    }

    // 处理文件选择
    fileInput.addEventListener('change', function() {
        if (fileInput.files.length) {
            handleFiles(fileInput.files);
        }
    });

    // 处理文件预览
    function handleFiles(files) {
        const file = files[0];
        
        // 验证文件类型
        if (!file.type.match('image.*')) {
            showError('请上传图片文件！');
            return;
        }
        
        // 验证文件大小 (限制为10MB)
        if (file.size > 10 * 1024 * 1024) {
            showError('文件大小不能超过10MB！');
            return;
        }
        
        // 隐藏错误信息
        hideError();
        
        // 创建预览
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            uploadForm.hidden = true;
            previewContainer.hidden = false;
            
            // 启用识别按钮
            recognizeBtn.disabled = false;
            
            // 添加动画效果
            previewContainer.style.animation = 'fadeIn 0.5s ease-out';
        };
        reader.readAsDataURL(file);
    }

    // 更换图片按钮
    changeImageBtn.addEventListener('click', function() {
        resetUploadArea();
        // 清除上一次的识别结果
        clearPreviousResults();
    });

    // 重置上传区域
    function resetUploadArea() {
        uploadForm.hidden = false;
        previewContainer.hidden = true;
        fileInput.value = '';
        recognizeBtn.disabled = true; // 禁用识别按钮
        hideError();
    }

    // 清除之前的识别结果
    function clearPreviousResults() {
        console.log("清除之前的识别结果");
        
        // 清除结果文本区域
        const resultTextWrapper = document.querySelector('.result-text-wrapper');
        
        // 清除布局切换按钮
        const existingToggleContainer = resultTextWrapper.querySelector('.layout-toggle-container');
        if (existingToggleContainer) {
            existingToggleContainer.remove();
        }
        
        // 清除结果容器
        const existingResultContainer = resultTextWrapper.querySelector('.result-container-wrapper');
        if (existingResultContainer) {
            existingResultContainer.remove();
        }
        
        // 清除无文本提示
        const existingMessage = resultTextWrapper.querySelector('.no-text-message');
        if (existingMessage) {
            existingMessage.remove();
        }
        
        // 清除图像标注
        const imageContainer = document.querySelector('.result-image-wrapper');
        const existingAnnotations = imageContainer.querySelectorAll('.annotation-box');
        existingAnnotations.forEach(box => box.remove());
        
        // 清除模态框标注
        const modalAnnotationsContainer = document.querySelector('.modal-annotations-container');
        if (modalAnnotationsContainer) {
            modalAnnotationsContainer.innerHTML = '';
        }
        
        // 重置文本区域
        const resultTextArea = document.getElementById('result-text-area');
        resultTextArea.value = '';
        resultTextArea.style.display = 'block';
    }

    // 显示错误信息
    function showError(message) {
        errorText.textContent = message;
        errorMessage.hidden = false;
        
        // 自动隐藏错误信息
        setTimeout(() => {
            hideError();
        }, 5000);
    }

    // 隐藏错误信息
    function hideError() {
        errorMessage.hidden = true;
    }

    // 开始识别按钮
    recognizeBtn.addEventListener('click', function() {
        if (!fileInput.files.length || recognizeBtn.disabled) {
            return;
        }
        
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        
        // 显示加载动画
        loadingOverlay.hidden = false;
        
        // 发送识别请求
        fetch('/recognize', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('服务器响应错误');
            }
            return response.json();
        })
        .then(data => {
            // 隐藏加载动画
            loadingOverlay.hidden = true;
            
            // 清除之前的识别结果
            clearPreviousResults();
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            // 检查OCR识别结果是否有错误
            if (data.text && typeof data.text === 'object' && data.text.errcode !== undefined && data.text.errcode !== 0) {
                showError(`OCR识别错误: 不支持的图片类型`);
                return;
            }
            
            // 显示识别结果
            resultImage.src = 'data:image/jpeg;base64,' + data.image;
            resultSection.hidden = false;
            
            // 提取识别结果
            let recognizedItems = [];
            let hasRecognizedText = false;
            
            // 检查是否有识别结果
            if (data.textResults && data.textResults.length > 0) {
                hasRecognizedText = true;
                recognizedItems = data.textResults.map(item => ({
                    text: item.text,
                    confidence: item.confidence
                }));
            } else if (typeof data.text === 'string' && data.text.trim() !== '') {
                hasRecognizedText = true;
                recognizedItems = [{
                    text: data.text,
                    confidence: 1.0 // 默认置信度
                }];
            } else if (data.text && data.text.ocr_response && data.text.ocr_response.length > 0) {
                // 直接从OCR响应中提取文本
                hasRecognizedText = true;
                recognizedItems = data.text.ocr_response.map(item => ({
                    text: item.text,
                    confidence: item.rate
                }));
            }
            
            console.log("识别结果:", data);
            console.log("是否有识别文本:", hasRecognizedText);
            
            // 获取结果文本区域和按钮
            const resultTextWrapper = document.querySelector('.result-text-wrapper');
            const resultActions = document.querySelector('.result-actions');
            
            if (hasRecognizedText) {
                // 有识别结果时，创建美观的结果列表
                resultTextArea.style.display = 'none';
                resultActions.style.display = 'flex';
                
                // 创建布局切换按钮
                const layoutToggleContainer = document.createElement('div');
                layoutToggleContainer.className = 'layout-toggle-container';
                layoutToggleContainer.style.position = 'relative';
                layoutToggleContainer.style.zIndex = '30'; // 确保最高层级
                
                const listViewBtn = document.createElement('button');
                listViewBtn.className = 'layout-btn active';
                listViewBtn.type = 'button'; // 明确指定按钮类型
                listViewBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                    <span>列表视图</span>
                `;
                
                const originalLayoutBtn = document.createElement('button');
                originalLayoutBtn.className = 'layout-btn';
                originalLayoutBtn.type = 'button'; // 明确指定按钮类型
                originalLayoutBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                        <line x1="15" y1="3" x2="15" y2="21"></line>
                        <line x1="3" y1="9" x2="21" y2="9"></line>
                        <line x1="3" y1="15" x2="21" y2="15"></line>
                    </svg>
                    <span>原图布局</span>
                `;
                
                // 先添加按钮到容器
                layoutToggleContainer.appendChild(listViewBtn);
                layoutToggleContainer.appendChild(originalLayoutBtn);
                
                // 创建结果容器（用于切换不同视图）
                const resultContainer = document.createElement('div');
                resultContainer.className = 'result-container-wrapper';
                resultContainer.style.position = 'relative';
                resultContainer.style.zIndex = '1';
                
                // 创建列表视图
                const resultList = document.createElement('div');
                resultList.className = 'result-list';
                resultList.style.display = 'flex'; // 默认显示
                
                // 如果结果数量大于5，添加紧凑布局类
                if (recognizedItems.length > 5) {
                    resultList.classList.add('compact');
                }
                
                // 为每个识别项创建一个结果项
                recognizedItems.forEach((item, index) => {
                    const resultItem = document.createElement('div');
                    resultItem.className = 'result-item';
                    
                    // 文本内容
                    const textContent = document.createElement('div');
                    textContent.className = 'result-text';
                    textContent.textContent = item.text;
                    
                    // 置信度指示器
                    const confidenceWrapper = document.createElement('div');
                    confidenceWrapper.className = 'confidence-wrapper';
                    
                    const confidenceBar = document.createElement('div');
                    confidenceBar.className = 'confidence-bar';
                    
                    const confidenceValue = document.createElement('div');
                    confidenceValue.className = 'confidence-value';
                    confidenceValue.style.width = `${(item.confidence * 100).toFixed(0)}%`;
                    
                    // 根据置信度设置颜色
                    if (item.confidence >= 0.9) {
                        confidenceValue.classList.add('high-confidence');
                    } else if (item.confidence >= 0.7) {
                        confidenceValue.classList.add('medium-confidence');
                    } else {
                        confidenceValue.classList.add('low-confidence');
                    }
                    
                    const confidenceText = document.createElement('span');
                    confidenceText.className = 'confidence-text';
                    confidenceText.textContent = `置信度: ${(item.confidence * 100).toFixed(0)}%`;
                    
                    // 组装置信度指示器
                    confidenceBar.appendChild(confidenceValue);
                    confidenceWrapper.appendChild(confidenceBar);
                    confidenceWrapper.appendChild(confidenceText);
                    
                    // 组装结果项
                    resultItem.appendChild(textContent);
                    resultItem.appendChild(confidenceWrapper);
                    
                    // 添加到结果列表
                    resultList.appendChild(resultItem);
                });
                
                // 创建原图布局视图
                const originalLayoutView = document.createElement('div');
                originalLayoutView.className = 'original-layout-view';
                originalLayoutView.style.display = 'none'; // 默认隐藏
                
                // 创建一个与原图尺寸相同的容器
                const layoutContainer = document.createElement('div');
                layoutContainer.className = 'layout-container';
                layoutContainer.style.position = 'relative';
                
                // 添加放大按钮到原图布局容器
                const layoutZoomButton = document.createElement('button');
                layoutZoomButton.className = 'zoom-button';
                layoutZoomButton.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        <line x1="11" y1="8" x2="11" y2="14"></line>
                        <line x1="8" y1="11" x2="14" y2="11"></line>
                    </svg>
                `;
                layoutZoomButton.style.position = 'absolute';
                layoutZoomButton.style.top = '10px';
                layoutZoomButton.style.right = '10px';
                layoutZoomButton.style.zIndex = '20';
                layoutContainer.appendChild(layoutZoomButton);
                
                // 添加放大按钮点击事件
                layoutZoomButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("点击原图布局放大按钮");
                    
                    // 创建模态框
                    const layoutModal = document.createElement('div');
                    layoutModal.className = 'image-modal layout-modal';
                    layoutModal.innerHTML = `
                        <div class="modal-content">
                            <button class="modal-close">&times;</button>
                            <div class="layout-modal-container" style="position: relative; width: 90vw; height: 80vh; overflow: auto;">
                                <img src="data:image/jpeg;base64,${data.image}" class="modal-image layout-modal-image" style="width: auto; height: auto; max-width: none; max-height: none;">
                                <div class="layout-modal-text-blocks"></div>
                            </div>
                        </div>
                    `;
                    document.body.appendChild(layoutModal);
                    
                    // 显示模态框
                    setTimeout(() => {
                        layoutModal.classList.add('active');
                    }, 10);
                    
                    // 关闭按钮事件
                    const closeBtn = layoutModal.querySelector('.modal-close');
                    closeBtn.addEventListener('click', function() {
                        layoutModal.classList.remove('active');
                        setTimeout(() => {
                            document.body.removeChild(layoutModal);
                        }, 300);
                    });
                    
                    // 点击模态框背景关闭
                    layoutModal.addEventListener('click', function(e) {
                        if (e.target === layoutModal) {
                            layoutModal.classList.remove('active');
                            setTimeout(() => {
                                document.body.removeChild(layoutModal);
                            }, 300);
                        }
                    });
                    
                    // 创建放大版的文本块
                    const modalImage = layoutModal.querySelector('.layout-modal-image');
                    const textBlocksContainer = layoutModal.querySelector('.layout-modal-text-blocks');
                    
                    // 获取所有文本块
                    const textBlocks = document.querySelectorAll('.text-block:not(.modal-text-block)');
                    
                    // 等待图片加载完成
                    modalImage.onload = function() {
                        // 复制文本块到模态框
                        textBlocks.forEach((block) => {
                            const modalTextBlock = document.createElement('div');
                            modalTextBlock.className = 'text-block modal-text-block';
                            
                            // 复制原始文本块的样式和位置
                            modalTextBlock.style.position = 'absolute';
                            modalTextBlock.style.left = block.style.left;
                            modalTextBlock.style.top = block.style.top;
                            modalTextBlock.style.width = block.style.width;
                            modalTextBlock.style.height = block.style.height;
                            modalTextBlock.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                            modalTextBlock.style.border = 'none';
                            modalTextBlock.style.borderRadius = '3px';
                            modalTextBlock.style.padding = '2px 4px';
                            modalTextBlock.style.display = 'flex';
                            modalTextBlock.style.alignItems = 'center';
                            modalTextBlock.style.justifyContent = 'center';
                            modalTextBlock.style.textAlign = 'center';
                            modalTextBlock.style.fontSize = '14px'; // 放大后字体稍大
                            modalTextBlock.style.lineHeight = '1.2';
                            modalTextBlock.style.overflow = 'hidden';
                            modalTextBlock.style.wordBreak = 'break-word';
                            modalTextBlock.style.whiteSpace = 'normal';
                            
                            // 复制文本内容
                            modalTextBlock.textContent = block.textContent;
                            
                            // 添加到模态框容器
                            textBlocksContainer.appendChild(modalTextBlock);
                        });
                    };
                    
                    // 如果图片已加载，手动触发onload
                    if (modalImage.complete) {
                        modalImage.onload();
                    }
                });
                
                // 获取原图尺寸
                const originalWidth = data.imageWidth || (data.text && data.text.width) || 1;
                const originalHeight = data.imageHeight || (data.text && data.text.height) || 1;
                
                // 设置容器样式
                layoutContainer.style.position = 'relative';
                layoutContainer.style.width = '100%';
                layoutContainer.style.height = '0';
                layoutContainer.style.paddingBottom = `${(originalHeight / originalWidth) * 100}%`;
                layoutContainer.style.backgroundColor = 'var(--gray-100)';
                layoutContainer.style.borderRadius = 'var(--border-radius)';
                layoutContainer.style.overflow = 'hidden';
                
                // 添加原图作为背景
                const layoutBackground = document.createElement('img');
                layoutBackground.src = 'data:image/jpeg;base64,' + data.image;
                layoutBackground.style.position = 'absolute';
                layoutBackground.style.top = '0';
                layoutBackground.style.left = '0';
                layoutBackground.style.width = '100%';
                layoutBackground.style.height = '100%';
                layoutBackground.style.objectFit = 'contain';
                layoutBackground.style.opacity = '0.2'; // 降低背景图透明度，只作为参考
                layoutContainer.appendChild(layoutBackground);
                
                // 为每个识别项创建一个文本块
                let hasValidBoxes = false;
                
                // 从OCR响应中提取边界框信息
                let itemsWithBoxes = [];
                if (data.textResults && data.textResults.length > 0) {
                    itemsWithBoxes = data.textResults.filter(item => item.box);
                } else if (data.text && data.text.ocr_response && data.text.ocr_response.length > 0) {
                    itemsWithBoxes = data.text.ocr_response.map(item => ({
                        text: item.text,
                        confidence: item.rate,
                        box: {
                            left: item.left,
                            top: item.top,
                            right: item.right,
                            bottom: item.bottom
                        }
                    })).filter(item => item.box);
                }
                
                console.log("带边界框的项目:", itemsWithBoxes);
                
                if (itemsWithBoxes.length > 0) {
                    hasValidBoxes = true;
                    
                    itemsWithBoxes.forEach((item, index) => {
                        const textBlock = document.createElement('div');
                        textBlock.className = 'text-block';
                        
                        // 计算位置和大小（相对于容器的百分比）
                        const left = (item.box.left / originalWidth) * 100;
                        const top = (item.box.top / originalHeight) * 100;
                        const width = ((item.box.right - item.box.left) / originalWidth) * 100;
                        const height = ((item.box.bottom - item.box.top) / originalHeight) * 100;
                        
                        // 设置文本块样式
                        textBlock.style.position = 'absolute';
                        textBlock.style.left = `${left}%`;
                        textBlock.style.top = `${top}%`;
                        textBlock.style.width = `${width}%`;
                        textBlock.style.height = `${height}%`;
                        textBlock.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                        textBlock.style.border = 'none'; // 移除边框
                        textBlock.style.borderRadius = '3px';
                        textBlock.style.padding = '2px 4px';
                        
                        // 调整文本样式，使其铺满框框
                        textBlock.style.display = 'flex';
                        textBlock.style.alignItems = 'center';
                        textBlock.style.justifyContent = 'center';
                        textBlock.style.textAlign = 'center';
                        textBlock.style.fontSize = '12px';
                        textBlock.style.lineHeight = '1.2';
                        textBlock.style.overflow = 'hidden';
                        textBlock.style.wordBreak = 'break-word';
                        textBlock.style.whiteSpace = 'normal';
                        
                        // 设置文本内容
                        textBlock.textContent = item.text;
                        
                        // 添加到布局容器
                        layoutContainer.appendChild(textBlock);
                    });
                }
                
                // 如果没有有效的边界框，添加提示信息
                if (!hasValidBoxes) {
                    const noBoxesMessage = document.createElement('div');
                    noBoxesMessage.className = 'no-boxes-message';
                    noBoxesMessage.style.position = 'absolute';
                    noBoxesMessage.style.top = '50%';
                    noBoxesMessage.style.left = '50%';
                    noBoxesMessage.style.transform = 'translate(-50%, -50%)';
                    noBoxesMessage.style.textAlign = 'center';
                    noBoxesMessage.style.color = 'var(--gray-500)';
                    noBoxesMessage.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 10px;">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="9" y1="3" x2="9" y2="21"></line>
                            <line x1="15" y1="3" x2="15" y2="21"></line>
                            <line x1="3" y1="9" x2="21" y2="9"></line>
                            <line x1="3" y1="15" x2="21" y2="15"></line>
                        </svg>
                        <p>无法显示原图布局</p>
                        <p style="font-size: 12px;">识别结果中缺少位置信息</p>
                    `;
                    layoutContainer.appendChild(noBoxesMessage);
                    
                    // 禁用原图布局按钮
                    originalLayoutBtn.disabled = true;
                    originalLayoutBtn.style.opacity = '0.5';
                    originalLayoutBtn.style.cursor = 'not-allowed';
                }
                
                originalLayoutView.appendChild(layoutContainer);
                
                // 添加视图到结果容器
                resultContainer.appendChild(resultList);
                resultContainer.appendChild(originalLayoutView);
                
                // 先添加容器到DOM
                resultTextWrapper.appendChild(layoutToggleContainer);
                resultTextWrapper.appendChild(resultContainer);
                
                // 然后添加点击事件处理函数
                listViewBtn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("列表视图按钮被点击");
                    
                    if (!this.classList.contains('active') && !this.disabled) {
                        this.classList.add('active');
                        originalLayoutBtn.classList.remove('active');
                        resultList.style.display = 'flex';
                        originalLayoutView.style.display = 'none';
                    }
                    
                    return false;
                };
                
                originalLayoutBtn.onclick = function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("原图布局按钮被点击");
                    
                    if (!this.classList.contains('active') && !this.disabled) {
                        this.classList.add('active');
                        listViewBtn.classList.remove('active');
                        resultList.style.display = 'none';
                        originalLayoutView.style.display = 'block';
                    }
                    
                    return false;
                };
                
                // 更新隐藏的文本区域（仅包含文本，用于复制）
                resultTextArea.value = recognizedItems.map(item => item.text).join('\n');
                
                // 创建标注区域
                createAnnotations(data);

                // 在布局切换按钮下方添加置信度滑块
                const confidenceSliderContainer = document.createElement('div');
                confidenceSliderContainer.className = 'confidence-slider-container';
                confidenceSliderContainer.innerHTML = `
                    <div class="slider-header">
                        <span>置信度过滤</span>
                        <span class="slider-value">0%</span>
                    </div>
                    <div class="slider-container">
                        <input type="range" min="0" max="100" value="0" class="confidence-slider" id="confidenceSlider">
                        <div class="slider-markers">
                            <button class="slider-marker" data-value="0">
                                <span class="marker-label">全部</span>
                                <span class="marker-percent">0%</span>
                            </button>
                            <button class="slider-marker" data-value="50">
                                <span class="marker-label">一般</span>
                                <span class="marker-percent">50%</span>
                            </button>
                            <button class="slider-marker" data-value="70">
                                <span class="marker-label">较好</span>
                                <span class="marker-percent">70%</span>
                            </button>
                            <button class="slider-marker" data-value="85">
                                <span class="marker-label">良好</span>
                                <span class="marker-percent">85%</span>
                            </button>
                            <button class="slider-marker" data-value="95">
                                <span class="marker-label">极佳</span>
                                <span class="marker-percent">95%</span>
                            </button>
                        </div>
                    </div>
                    <div class="slider-labels">
                        <span>显示全部结果</span>
                        <span>仅高质量结果</span>
                    </div>
                `;

                // 将滑块添加到布局切换按钮之后
                resultTextWrapper.insertBefore(confidenceSliderContainer, resultContainer);

                // 获取滑块和显示值元素
                const confidenceSlider = confidenceSliderContainer.querySelector('.confidence-slider');
                const sliderValue = confidenceSliderContainer.querySelector('.slider-value');

                // 获取所有快捷点击区域按钮
                const sliderMarkers = confidenceSliderContainer.querySelectorAll('.slider-marker');

                // 为每个快捷点击区域按钮添加点击事件
                sliderMarkers.forEach(marker => {
                    marker.addEventListener('click', function() {
                        const value = parseInt(this.dataset.value);
                        confidenceSlider.value = value;
                        sliderValue.textContent = `${value}%`;
                        
                        // 触发滑块的input事件，以更新显示
                        const inputEvent = new Event('input', { bubbles: true });
                        confidenceSlider.dispatchEvent(inputEvent);
                        
                        // 高亮当前选中的快捷点击区域
                        sliderMarkers.forEach(m => m.classList.remove('active'));
                        this.classList.add('active');
                    });
                });

                // 修改滑块事件监听，同步更新快捷点击区域的高亮状态
                confidenceSlider.addEventListener('input', function() {
                    const threshold = parseInt(this.value) / 100;
                    sliderValue.textContent = `${this.value}%`;
                    
                    // 更新快捷点击区域的高亮状态
                    sliderMarkers.forEach(marker => {
                        const markerValue = parseInt(marker.dataset.value);
                        if (markerValue === parseInt(this.value)) {
                            marker.classList.add('active');
                        } else {
                            marker.classList.remove('active');
                        }
                    });
                    
                    // 更新列表视图中的项目显示
                    const resultItems = resultList.querySelectorAll('.result-item');
                    resultItems.forEach((item, index) => {
                        const confidence = recognizedItems[index].confidence;
                        if (confidence >= threshold) {
                            item.style.display = 'flex'; // 使用flex确保布局正确
                        } else {
                            item.style.display = 'none';
                        }
                    });
                    
                    // 更新原图布局中的文本块显示
                    const textBlocks = layoutContainer.querySelectorAll('.text-block');
                    textBlocks.forEach((block, index) => {
                        const confidence = recognizedItems[index].confidence;
                        if (confidence >= threshold) {
                            block.style.display = 'flex'; // 使用flex确保文本居中
                        } else {
                            block.style.display = 'none';
                        }
                    });
                    
                    // 更新原始图片区域的标注框显示
                    const annotationBoxes = document.querySelectorAll('.annotation-box');
                    annotationBoxes.forEach((box, index) => {
                        const confidence = recognizedItems[index].confidence;
                        if (confidence >= threshold) {
                            box.style.display = 'block'; // 显示标注框
                        } else {
                            box.style.display = 'none'; // 隐藏标注框
                        }
                    });
                    
                    // 更新隐藏的文本区域（用于复制）
                    const filteredText = recognizedItems
                        .filter(item => item.confidence >= threshold) // 使用>=确保包含等于的情况
                        .map(item => item.text)
                        .join('\n');
                    resultTextArea.value = filteredText;
                });
            } else {
                // 没有识别结果时显示提示信息，隐藏文本框和按钮
                resultTextArea.style.display = 'none';
                resultActions.style.display = 'none';
                
                // 创建提示信息元素
                const noTextMessage = document.createElement('div');
                noTextMessage.className = 'no-text-message';
                noTextMessage.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mb-4">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <p style="font-size: 18px; color: var(--gray-700); margin-bottom: 8px;">未识别出任何文字内容</p>
                    <p style="font-size: 14px; color: var(--gray-500);">请尝试上传其他图片或确保图片中包含清晰的文字</p>
                `;
                
                // 添加提示信息
                resultTextWrapper.appendChild(noTextMessage);
            }
            
            // 添加动画效果
            resultSection.style.animation = 'fadeInUp 0.8s ease-out';
            
            // 滚动到结果部分
            setTimeout(() => {
                resultSection.scrollIntoView({ behavior: 'smooth' });
            }, 300);
        })
        .catch(error => {
            loadingOverlay.hidden = true;
            showError('识别过程中发生错误: ' + error.message);
        });
    });

    // 创建图片放大模态框
    const imageModal = document.createElement('div');
    imageModal.className = 'image-modal';
    imageModal.innerHTML = `
        <div class="modal-content">
            <img class="modal-image" src="" alt="放大图片">
            <button class="modal-close">&times;</button>
        </div>
    `;
    document.body.appendChild(imageModal);

    // 获取模态框元素
    const modalImage = imageModal.querySelector('.modal-image');
    const modalClose = imageModal.querySelector('.modal-close');

    // 关闭模态框
    modalClose.addEventListener('click', function() {
        imageModal.classList.remove('active');
    });

    // 点击模态框背景也可以关闭
    imageModal.addEventListener('click', function(e) {
        if (e.target === imageModal) {
            imageModal.classList.remove('active');
        }
    });

    // 修改createAnnotations函数，确保正确创建标注框
    function createAnnotations(data) {
        console.log("开始创建标注，数据:", data);
        
        // 获取图像容器
        const imageContainer = document.querySelector('.result-image-wrapper');
        
        // 清除之前的标注和按钮
        const existingAnnotations = imageContainer.querySelectorAll('.annotation-box');
        existingAnnotations.forEach(box => box.remove());
        
        const existingZoomButton = imageContainer.querySelector('.zoom-button');
        if (existingZoomButton) {
            existingZoomButton.remove();
        }
        
        // 准备标注数据
        let annotationItems = [];
        
        console.log("检查OCR响应数据:", data.text);
        
        // 从textResults中获取标注数据
        if (data.textResults && data.textResults.length > 0) {
            console.log("使用textResults数据:", data.textResults);
            annotationItems = data.textResults;
        } 
        // 或者直接从OCR响应中获取
        else if (data.text && data.text.ocr_response && data.text.ocr_response.length > 0) {
            console.log("使用OCR响应数据:", data.text.ocr_response);
            data.text.ocr_response.forEach(item => {
                annotationItems.push({
                    text: item.text,
                    confidence: item.rate,
                    box: {
                        left: item.left,
                        top: item.top,
                        right: item.right,
                        bottom: item.bottom
                    }
                });
            });
        }
        
        console.log("处理后的标注项:", annotationItems);
        
        // 如果没有标注数据，则返回
        if (annotationItems.length === 0) {
            console.log("没有标注数据，返回");
            return;
        }
        
        // 只有当识别内容项大于等于5个时才显示放大按钮
        if (annotationItems.length >= 5) {
            console.log("识别内容项数量:", annotationItems.length, ">=5，显示放大按钮");
            // 添加放大按钮
            const zoomButton = document.createElement('button');
            zoomButton.className = 'zoom-button';
            zoomButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
            `;
            imageContainer.appendChild(zoomButton);
            
            // 添加放大按钮点击事件
            zoomButton.addEventListener('click', function() {
                console.log("点击放大按钮");
                const img = document.getElementById('result-image');
                modalImage.src = img.src;
                
                // 清除之前的模态框标注
                const modalAnnotationsContainer = imageModal.querySelector('.modal-annotations-container');
                if (modalAnnotationsContainer) {
                    modalAnnotationsContainer.remove();
                }
                
                // 创建新的标注容器
                const newModalAnnotationsContainer = document.createElement('div');
                newModalAnnotationsContainer.className = 'modal-annotations-container';
                imageModal.querySelector('.modal-content').appendChild(newModalAnnotationsContainer);
                
                // 显示模态框
                imageModal.classList.add('active');
                
                // 创建模态框中的标注
                const createModalBoxes = function() {
                    console.log("创建模态框标注");
                    
                    // 获取原始图像尺寸
                    const originalWidth = data.imageWidth || data.text.width || img.naturalWidth || img.clientWidth;
                    const originalHeight = data.imageHeight || data.text.height || img.naturalHeight || img.clientHeight;
                    
                    console.log("原始图像尺寸:", originalWidth, "x", originalHeight);
                    
                    // 获取模态图像的尺寸
                    const modalImgWidth = modalImage.clientWidth;
                    const modalImgHeight = modalImage.clientHeight;
                    
                    console.log("模态图像尺寸:", modalImgWidth, "x", modalImgHeight);
                    
                    // 计算缩放比例 - 使用更可靠的方法
                    let scaleX, scaleY;
                    
                    // 如果原始图像尺寸很小（小于100像素），使用固定的放大倍数
                    if (originalWidth < 100 || originalHeight < 100) {
                        console.log("原始图像很小，使用固定放大倍数");
                        // 对于小图片，使用固定的放大倍数（例如5倍）
                        const zoomFactor = 5;
                        scaleX = (modalImgWidth / originalWidth) * zoomFactor;
                        scaleY = (modalImgHeight / originalHeight) * zoomFactor;
                        
                        // 调整模态图像大小
                        modalImage.style.width = (originalWidth * zoomFactor) + 'px';
                        modalImage.style.height = 'auto';
                    } else {
                        // 对于正常大小的图片，使用常规缩放
                        scaleX = modalImgWidth / originalWidth;
                        scaleY = modalImgHeight / originalHeight;
                    }
                    
                    console.log("模态框缩放比例:", scaleX, scaleY);
                    
                    // 为每个文本结果创建模态框中的标注
                    annotationItems.forEach((item, index) => {
                        console.log("创建模态框标注框:", index, item);
                        
                        const modalBox = document.createElement('div');
                        modalBox.className = 'modal-annotation-box';
                        modalBox.dataset.index = index;
                        modalBox.style.left = (item.box.left * scaleX) + 'px';
                        modalBox.style.top = (item.box.top * scaleY) + 'px';
                        modalBox.style.width = ((item.box.right - item.box.left) * scaleX) + 'px';
                        modalBox.style.height = ((item.box.bottom - item.box.top) * scaleY) + 'px';
                        
                        console.log("模态框标注位置:", modalBox.style.left, modalBox.style.top, modalBox.style.width, modalBox.style.height);
                        
                        // 创建模态框中的提示
                        const modalTooltip = document.createElement('div');
                        modalTooltip.className = 'modal-annotation-tooltip';
                        modalTooltip.textContent = `${item.text} (${(item.confidence * 100).toFixed(2)}%)`;
                        modalBox.appendChild(modalTooltip);
                        
                        // 添加到模态框的标注容器
                        newModalAnnotationsContainer.appendChild(modalBox);
                        
                        // 添加鼠标悬停事件
                        modalBox.addEventListener('mouseenter', function() {
                            modalTooltip.style.opacity = '1';
                        });
                        
                        modalBox.addEventListener('mouseleave', function() {
                            modalTooltip.style.opacity = '0';
                        });
                    });
                };
                
                // 如果模态图像已加载，立即创建标注框
                if (modalImage.complete) {
                    console.log("模态图像已加载，立即创建标注框");
                    createModalBoxes();
                } else {
                    // 否则等待模态图像加载完成
                    console.log("等待模态图像加载完成");
                    modalImage.onload = createModalBoxes;
                }
            });
        } else {
            console.log("识别内容项数量:", annotationItems.length, "<5，不显示放大按钮");
        }
        
        // 获取图像尺寸
        const img = document.getElementById('result-image');
        console.log("图像元素:", img);
        
        // 立即创建标注框，不等待onload
        const createBoxes = function() {
            const imgWidth = img.clientWidth;
            const imgHeight = img.clientHeight;
            
            console.log("图像尺寸:", imgWidth, "x", imgHeight);
            console.log("原始图像尺寸:", data.imageWidth || data.text.width, "x", data.imageHeight || data.text.height);
            
            // 计算缩放比例
            const scaleX = imgWidth / (data.imageWidth || data.text.width || 1);
            const scaleY = imgHeight / (data.imageHeight || data.text.height || 1);
            
            console.log("缩放比例:", scaleX, scaleY);
            
            // 为每个文本结果创建标注框
            annotationItems.forEach((item, index) => {
                console.log("创建标注框:", index, item);
                
                const box = document.createElement('div');
                box.className = 'annotation-box';
                box.dataset.index = index;
                box.style.position = 'absolute';
                box.style.left = (item.box.left * scaleX) + 'px';
                box.style.top = (item.box.top * scaleY) + 'px';
                box.style.width = ((item.box.right - item.box.left) * scaleX) + 'px';
                box.style.height = ((item.box.bottom - item.box.top) * scaleY) + 'px';
                box.style.pointerEvents = 'auto'; // 确保可以接收鼠标事件
                
                console.log("标注框位置:", box.style.left, box.style.top, box.style.width, box.style.height);
                
                // 创建悬停提示
                const tooltip = document.createElement('div');
                tooltip.className = 'annotation-tooltip';
                tooltip.textContent = `${item.text} (${(item.confidence * 100).toFixed(2)}%)`;
                
                box.appendChild(tooltip);
                imageContainer.appendChild(box);
                
                // 添加鼠标悬停事件
                box.addEventListener('mouseenter', function() {
                    tooltip.style.opacity = '1';
                });
                
                box.addEventListener('mouseleave', function() {
                    tooltip.style.opacity = '0';
                });
            });
        };
        
        // 如果图像已加载，立即创建标注框
        if (img.complete) {
            console.log("图像已加载，立即创建标注框");
            createBoxes();
        } else {
            // 否则等待图像加载完成
            console.log("等待图像加载完成");
            img.onload = createBoxes;
        }
    }

    // 修改复制按钮的点击事件处理函数
    copyBtn.addEventListener('click', function() {
        // 由于我们隐藏了文本区域，需要使用现代的Clipboard API
        try {
            // 使用Clipboard API
            navigator.clipboard.writeText(resultTextArea.value)
                .then(() => {
                    // 显示复制成功动画
                    copyBtn.classList.add('copied');
                    copyBtn.textContent = '已复制！';
                    
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            复制文本
                        `;
                    }, 2000);
                })
                .catch(err => {
                    console.error('无法使用Clipboard API复制: ', err);
                    // 回退到传统方法
                    fallbackCopy();
                });
        } catch (err) {
            console.error('Clipboard API不可用: ', err);
            // 回退到传统方法
            fallbackCopy();
        }
        
        // 传统复制方法作为回退
        function fallbackCopy() {
            // 临时显示文本区域以便选择
            resultTextArea.style.display = 'block';
            resultTextArea.style.position = 'fixed';
            resultTextArea.style.left = '-9999px';
            
            resultTextArea.select();
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    // 显示复制成功动画
                    copyBtn.classList.add('copied');
                    copyBtn.textContent = '已复制！';
                    
                    setTimeout(() => {
                        copyBtn.classList.remove('copied');
                        copyBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            复制文本
                        `;
                    }, 2000);
                } else {
                    showError('复制失败，请手动复制');
                }
            } catch (err) {
                showError('复制失败: ' + err);
            } finally {
                // 恢复文本区域的隐藏状态
                resultTextArea.style.display = 'none';
                resultTextArea.style.position = '';
                resultTextArea.style.left = '';
            }
        }
    });

    // 下载结果按钮
    downloadBtn.addEventListener('click', function() {
        if (!resultTextArea.value) return;
        
        const text = resultTextArea.value;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ocr-result-' + new Date().toISOString().slice(0, 10) + '.txt';
        
        // 添加下载动画
        downloadBtn.classList.add('downloading');
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // 恢复按钮状态
        setTimeout(() => {
            downloadBtn.classList.remove('downloading');
        }, 1000);
    });

    // 添加按钮点击效果
    document.querySelectorAll('.btn').forEach(btn => {
        if (!btn.disabled) {
            btn.addEventListener('mousedown', function() {
                this.classList.add('btn-active');
            });
            
            btn.addEventListener('mouseup', function() {
                this.classList.remove('btn-active');
            });
            
            btn.addEventListener('mouseleave', function() {
                this.classList.remove('btn-active');
            });
        }
    });

    // 添加上传图标动画
    const uploadIcon = document.querySelector('.upload-icon');
    if (uploadIcon) {
        uploadIcon.addEventListener('mouseover', function() {
            this.style.animation = 'none';
            setTimeout(() => {
                this.style.animation = 'bounce 2s infinite';
            }, 10);
        });
    }
});

// 添加CSS类
document.addEventListener('DOMContentLoaded', function() {
    // 为按钮添加涟漪效果
    document.querySelectorAll('.btn').forEach(button => {
        button.addEventListener('click', function(e) {
            if (this.disabled) return;
            
            const x = e.clientX - e.target.getBoundingClientRect().left;
            const y = e.clientY - e.target.getBoundingClientRect().top;
            
            const ripple = document.createElement('span');
            ripple.classList.add('ripple');
            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}); 