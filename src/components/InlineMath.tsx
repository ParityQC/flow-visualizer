// SPDX-License-Identifier: GPL-2.0-or-later
// ParityQC © 2026. See LICENSE.txt in the top level directory for details.
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
