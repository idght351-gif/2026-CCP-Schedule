import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: any | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    try {
      const parsed = JSON.parse(error.message);
      return { hasError: true, errorInfo: parsed };
    } catch (e) {
      return { hasError: true, errorInfo: { error: error.message } };
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      const isPermissionError = this.state.errorInfo?.error?.includes('permission') || 
                               this.state.errorInfo?.error?.includes('insufficient');

      return (
        <div className="min-h-screen bg-app-bg flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-[32px] shadow-2xl border border-pastel-pink max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-pastel-pink rounded-full flex items-center justify-center mx-auto shadow-lg shadow-pastel-pink/50">
              <AlertCircle className="w-10 h-10 text-primary-purple" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-text-main">시스템 오류 발생</h2>
              <p className="text-text-muted font-medium">
                {isPermissionError 
                  ? "데이터 접근 권한이 없거나 만료되었습니다. 다시 로그인해 주세요." 
                  : "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."}
              </p>
            </div>

            {this.state.errorInfo && (
              <div className="bg-app-bg p-4 rounded-2xl text-left text-[10px] font-mono text-text-muted overflow-auto max-h-40 border border-pastel-purple/30">
                <pre>{JSON.stringify(this.state.errorInfo, null, 2)}</pre>
              </div>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-primary-purple text-white rounded-2xl font-bold shadow-lg shadow-primary-purple/30 hover:bg-primary-purple/90 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
