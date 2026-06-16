import katex from 'katex';
import { useMemo } from 'react';

interface InlineMathProps {
  math?: string;
  children?: string;
}

export function InlineMath({ math, children }: InlineMathProps) {
  const formula = math ?? children ?? '';
  const html = useMemo(
    () => katex.renderToString(formula, { throwOnError: false, strict: 'ignore' }),
    [formula]
  );
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
