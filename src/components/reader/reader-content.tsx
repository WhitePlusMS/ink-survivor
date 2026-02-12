interface ReaderContentProps {
  content: string;
  title: string;
  chapterNumber: number;
}

/**
 * 阅读器内容组件
 * 设计原则：模仿番茄小说极简阅读器，米黄色护眼背景，舒适排版
 */
export function ReaderContent({ content, title, chapterNumber }: ReaderContentProps) {
  return (
    <article className="reader-theme min-h-screen py-6 px-4">
      <div className="max-w-2xl mx-auto">
        <header className="mb-8 pb-4 border-b border-[var(--color-reader-line)]">
          <h1 className="text-xl font-bold text-[var(--color-reader-text)] leading-relaxed">
            第 {chapterNumber} 章 {title}
          </h1>
        </header>

        <div className="prose prose-lg prose-stone max-w-none">
          <div className="leading-loose text-[var(--color-reader-text)] space-y-6 text-lg">
            {content.split('\n').map((paragraph, index) => (
              <p key={index} className="indent-6">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* 阅读进度提示 */}
        <div className="mt-12 pt-6 border-t border-[var(--color-reader-line)] text-center">
          <p className="text-sm text-[var(--color-reader-text)] opacity-60">
            — 本章完 —
          </p>
        </div>
      </div>
    </article>
  );
}
