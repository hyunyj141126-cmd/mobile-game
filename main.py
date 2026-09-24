import sys
import os
from PyQt6.QtCore import QUrl, Qt
from PyQt6.QtWidgets import QApplication, QMainWindow
from PyQt6.QtWebEngineCore import QWebEngineSettings
from PyQt6.QtWebEngineWidgets import QWebEngineView

class WebGameWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Neon Cyber-Pulse Game")
        self.resize(1280, 720)
        
        # 화면 중앙 배치
        screen_geometry = QApplication.primaryScreen().geometry()
        x = (screen_geometry.width() - self.width()) // 2
        y = (screen_geometry.height() - self.height()) // 2
        self.move(x, y)

        # WebEngine 설정
        self.browser = QWebEngineView()
        
        settings = self.browser.page().settings()
        # 1. 속성 이름 소문자 'd' 적용
        settings.setAttribute(QWebEngineSettings.WebAttribute.Accelerated2dCanvasEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.WebGLEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PlaybackRequiresUserGesture, False)

        # 2. 로컬 HTML에서 외부 CDN/인터넷 리소스를 허용하는 설정 추가
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)

        # index.html 경로 탐색 (PyInstaller 패키징 대응)
        if getattr(sys, 'frozen', False):
            base_dir = sys._MEIPASS
        else:
            base_dir = os.path.dirname(os.path.abspath(__file__))

        html_path = os.path.join(base_dir, 'index.html')
        self.browser.setUrl(QUrl.fromLocalFile(html_path))

        self.setCentralWidget(self.browser)

    def keyPressEvent(self, event):
        if event.key() == Qt.Key.Key_F11:
            if self.isFullScreen():
                self.showNormal()
            else:
                self.showFullScreen()
        elif event.key() == Qt.Key.Key_Escape:
            if self.isFullScreen():
                self.showNormal()
        else:
            super().keyPressEvent(event)

if __name__ == "__main__":
    # CORS 및 보안 관련 브라우저 플래그 해제 (CDN 로딩 허용)
    sys.argv.append('--disable-web-security')
    sys.argv.append('--allow-file-access-from-files')
    sys.argv.append('--enable-gpu-rasterization')
    sys.argv.append('--enable-zero-copy')
    
    app = QApplication(sys.argv)
    window = WebGameWindow()
    window.show()
    sys.exit(app.exec())