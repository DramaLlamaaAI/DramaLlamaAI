import React, { useState, useRef } from 'react';
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChatAnalysisResult } from '@shared/schema';
import html2pdf from 'html2pdf.js';
import { toJpeg } from 'html-to-image';
import { useToast } from "@/hooks/use-toast";
import llamaImage from '@/assets/drama-llama-sunglasses.jpg';
import llamaLogo from '@/assets/drama-llama-logo.svg';
import BackHomeButton from "@/components/back-home-button";

interface FreeTierAnalysisProps {
  result: ChatAnalysisResult;
  me: string;
  them: string;
}

export function FreeTierAnalysis({ result, me, them }: FreeTierAnalysisProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Export as formal branded document with text copying
  const exportToPdf = async () => {
    if (!result) {
      toast({
        title: "Export Failed",
        description: "Could not create document. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      // Create a temporary container for the formal document
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      document.body.appendChild(tempContainer);
      
      // Render our formal document component to string
      const formalDocumentContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <title>Drama Llama Analysis</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 0;
              background: white;
            }
            
            .drama-llama-document {
              font-family: system-ui, -apple-system, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              background-color: white;
              color: #333;
            }
            
            .document-header {
              display: flex;
              align-items: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 2px solid #22C9C9;
            }
            
            .logo-container {
              width: 80px;
              margin-right: 20px;
            }
            
            .logo-container img {
              width: 100%;
              height: auto;
            }
            
            .header-text {
              flex: 1;
            }
            
            .header-text h1 {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              color: #22C9C9;
            }
            
            .header-text p {
              margin: 5px 0 0;
              font-size: 16px;
              color: #666;
            }
            
            .document-title {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 20px;
              color: #333;
            }
            
            .document-section {
              margin-bottom: 25px;
            }
            
            .section-title {
              font-size: 20px;
              font-weight: 600;
              margin-bottom: 15px;
              color: #22C9C9;
            }
            
            .section-content {
              font-size: 16px;
              line-height: 1.6;
            }
            
            .emotion-item {
              display: flex;
              align-items: center;
              margin-bottom: 10px;
            }
            
            .emotion-label {
              min-width: 120px;
              font-weight: 500;
            }
            
            .emotion-bar-container {
              flex: 1;
              height: 12px;
              background-color: #eee;
              border-radius: 6px;
              overflow: hidden;
            }
            
            .emotion-bar {
              height: 100%;
              background-color: #22C9C9;
            }
            
            .health-score {
              display: flex;
              align-items: center;
              margin: 15px 0;
              padding: 15px;
              background-color: #f9f9f9;
              border-radius: 8px;
            }
            
            .health-score-label {
              font-weight: 600;
              margin-right: 15px;
            }
            
            .health-score-value {
              font-size: 18px;
              font-weight: 700;
            }
            
            .health-score-red {
              color: #e53e3e;
            }
            
            .health-score-yellow {
              color: #d69e2e;
            }
            
            .health-score-light-green {
              color: #38a169;
            }
            
            .health-score-green {
              color: #2f855a;
            }
            
            .red-flags-count {
              font-weight: 600;
              color: #e53e3e;
            }
            
            .pattern-list {
              margin: 0;
              padding-left: 20px;
            }
            
            .pattern-item {
              margin-bottom: 8px;
            }
            
            .document-footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              font-size: 14px;
              color: #666;
              text-align: center;
            }
            
            /* Mobile styles */
            @media (max-width: 640px) {
              .document-header {
                flex-direction: column;
                text-align: center;
              }
              
              .logo-container {
                margin: 0 auto 15px;
              }
            }
          </style>
        </head>
        <body>
          <div class="drama-llama-document">
            <div class="document-header">
              <div class="logo-container">
                <img src="data:image/png;base64,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gSFdUoAMYQHPFcyd6LLyELm09wqLdKAAGeI8z+afMKYt4Lu+P21OE4YiXdKtWkOY70G8KU5jTcaEgmH5hQWYedFYzMtEGwdQ5t6GW5KjngJkCPM92L8/TGVtzI2eMrZ0QmFh3qjm1tama771h+13rXjJ/f7P8xheZESz8KRDRwPpngJkCPN9Y93aWmZP9hlXFHAtoWjzz/6weMOeuL9+eByOVBRQnJulGXlFuqAzSBaZ1/+JJwIZEItBQQ5UFAcwg+b6+PYHHnyt6lBr0Qe7jIPRnl9L7eXelTZH5V0t0n8KkCzLcXFuuThuT/x+bh42g+aWCH95eMmOLbtju5rMqGvr+y2a8WYItpB+sCWRvlGAZFljc4R/vGXmTw8esLJmHPt319fdt6d5z/LwmV6kl6fvXrSTDKN5GkeG8mY4CnN4+BniZWb9hEtfXHyKCxZEnzl3XuyOZ5fUffWG9zxeeJUxvb7i9wqGtNOqSf8pQLKkoQGef3YPobr48i/dwG3v55Rf9/K0cO3G6ppnW+YZbdnZ/uYIxGtgVB5T++/v0Hjo0t+pRPpMnYRZUlQIYybF4gvmH+eetJPYcddVv9rw87cjF0XJGdzLVg22RVAH4XA0HOJ9sn+4QukVBUiWBAI+XlFh3K6dbY+vfOr7j91+F9Pfvc6a+zHBSefylqMKokY4FD+4v6r7G4X1cFX6Rbd6ZYmZQV4OFM5fQPUTf77vmec2F32wYz8t+wdz6eiwjJnkFZcWedbnk3fCvJAiR4l0gxYN9VtDRJKpiiWSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpJAASKSQAEikkABIpLAP9IFEOknMzDDnAMHOFz74Vj4NIfzjlguCpChwoHFeT4rq2fOKch9Kh47YO0fO5wM/KCXiZ/Ue/HhI/2ZZChSgAwlcU5a9O5v7rj9l+7rFpx/Rlvo8QXFDfNnF/Rkdf8IFEsGgTkHsRjsOwCvroBJE6BijO5Ub1M5Bj91KDzj/PpX7vPGPX5uIH7Ot2+Yf2Zzc+uM+pZI4MPt+xpnTit7fXhBHnk5gQHuNftccr5EIsZ/3AXLl1Xzm7ZYLKbfmj7QGSTr3Nl3PCXlY8pYv6Oyr+t6nk9Lc2uobeX6jzvOEmYWDJ6TUZDrHfzG18+vqG9ombnivS2NP7vtrxvSl8+l3V4SB7Eo1B2Cmn3g5/hP/fa+v9Z5R6xC0k86g2RdLOPnj5s2Prbm/Q19XdnMY/KEMhYvXXvgB794MJYcHMCXvwQeURrj0Hdf/+bESCTaUF8fXllRMaoxPycQc865UCgSCEBLOEpLOOLm33Bv9aF9m9/dZXzhiJVR+ktnkOxrOX7u7CrGlRX1a/Vnn3i39Oe3PhiLxhJ/Xnwz7rofX/3g6UcfCbMm5Oe0hUKRxrq6pvqCgtxWz7OoeR6RSNTz/QxNTa2GozXS5uXlSrPOMKD/ZNZFRk+dukV3XXRk1pgxmblzT2yaPnXiLjVQQ5sCJPu6DY/2nzYXicTwPO+TMYPGDbPC/l19uHVkDxHPjJKSkbS2hTweWL1YD/2kJ1TFOvKKvM891Lxrw5ryvXvrzpw/f3JRX28ccnQ4rRbzAv7Bcz59Ql6unzMS7jJRBXDoUYCcPZf9S5e4vfsp3LDdrtyyq2bR3NOOX3TyjJL6uiZmnjChqLv2xLPk08OBfYfiDc3N9uahg1HCMQMXz/bxbKiG+x91VG43dh+AhpYPrH6/5wf8T7d96eVl61a8XzS8ICft7d1m7Y32QDw+fFRRwYsF+bnN4VAYz/dwdNYYTn+LDDXtb4caBcgZ/KD166vPfPThd75ZXVkbPLB712P33PvIjgfuunrO9Mnl7d134O++4EtmBsf3DLcNEIKHPorFf/7C29V3b9lTz+qdoQ/W2IJnXWv0rXhL9Dm6OGHcee0Pp9xy0cyJE48rDodC4aR9erjtVntrThgzvGjxZ2ed8KdpkwrXNzW3cOjgIduzczfOwfCCPGLxOGZ2pP9JZBDoLpbFoyVPXfe1/L8nv2/OMe6YsdR9vKuK0tJCjiv0ca69y9w5BzaAh7nJN9mYQXMYDjbw1fVroI7kmVd2bWS1GfVm1OHiLs2gRwB+EOPgvopbf9K6ZeuutZFI5MO62rqNVQcO7m1pDR9qCUWq20KRqurqustXb9x1yWuvbcjU1YXd/v11dQ31DfXVoVD4wMGqupa2cHOb16F0MpQF+9p+VJVvZqvM7E0zmWdml5p5P2ltbfsDLi1ndujjXVW89ta6Pzz2+LIHDW+jGTW4eE33Z29IPUr1DKgzaDDHfuA1MzYCm4BagwQz2gBD8YgIOWBjzLLfh+N5Fi8BVxpsO9LFkuw5KgKk0qDVjJNxnO1g+sxZVOLYChw0Y5HBV8x4z2AKDmpxtAGbcYQTt9Wx09DBIWAXsB/YgJEBPIujAJGuHPkqVqVBnYktMuNCHDOAVhw/w/EqMNbgcmC1wWocd+O4CvgxjjuAc4GxOD4CDOgmWVxiGrAFOAfY5GC18ySc1IXkk+uoOIPscPAujs3AcTj2AK8BkdR7u4FHMJ4A/orxRRwvACEzXgO+CMwm+abRFTi6Gg61GtgN7DP4CZDoFGnvvBNJoivqIs3ASgPnYDvGS0AT8CrGChyvAG8bnIXjLjOWAAXADGAHMNuMizCuAL4DvORgt4M9GB+bMdrBDKDUYCWOZbiugqvrfSpA5JMl2FWCbYdxDg7g2AO04agG/gD8wqAV+ALwNrAT+JzBPOB3BruAEhwXYaw1owXYj2Ozgw8dXIpjL/Apg09hrMXRbMZKB/tx1ONwJs61B0lSrjTkQ1JJPpHKSL8g+aBpV11dw3s1B2u31dbXN1VU3hnF5f4ynouXLLjrW4XjfnfpZf9+RnjnA7Ny2g4trXz1Zz9/Yenyl1i48MMnDx1qvHnn7tpfFeQWjNuxs3JKTcWcJT+a/qPM6MKKJdG2UM7y5W+d0NbWdjpw7/SHK39kk7fHw4dqy4MBrzG/oLB5+vSZW0/+3KfWn/nZs9Y7F28Nhadkak48ecq6MWXjD8Ri1l7l0o1aR53aA9X5K95bNWnrlg/n7tq16YRTTzx7XVHRiP1v+MMbRpeU1e/Zs6lo9OiJNZnMiMGOHZsL9u7eXh52bq9vxqGc3NwDw4cPr5o1a9amvLwRrW++s2TSgcoN/LfdeelVV83wPT9mR3r0hGHgyL9BslgV4fB97z7+xjvv3XXvFy89Z8aB6m21f99W84Orfjzm7iXvb/zuxdPjz/90xbLfLX6xbfW9F5xSuK+Wvz7/+saGQ4d2v7GytfCZN6e8e31L68GxoXDT3Lqag2fHo03UHLTH//Hau7a0NjX9oay0rGrZiiVTJoyetKxo+IjK1taWw1GwftWH1u/YuHH7lsXL37jukQee//aEcvfV5qamw9WjcDh82dIPi2KJ5VCfyFGn6mBV0UvPP3vavt3bLnxhyQtfDHh5/0qsZfKaD99Zsnef/9jk0prTDx6su+DQ3sP5Xxo1c/OLB3ZMXfH+66fEMsUEg7Wl4+c+V7L1zUtPLCq6qLGx+uKYa5h6qPrARTWH9l5ZXLTf/mPHu2f9Q6j+R9dc/aX33l91Kp6HczBmzAgOHKhWr/oQdeTPIGbg+1YSiVF4qGlP+fbdH03ZsmNz2a69Wwr3Vmweu69yG74XCLe1hg41hPJbGxsKa/bvGR9tqBteXdcwtaG+clzBpP8qNT9YHG5unNTSUFfR2tJc0Nba0rr+g1V+MFhWUFpQUlBYWDCsPBgMjhpRUlhcPHZMbtQGfHF8qFIVawg7srOB+vvCt9++YPSTL/z22oamD5kyZsSs0eMmrK+vrs7LZDI5LW2N+dUN++IdlgdQNnYS9U319VWVO8fH4/FYS1Nz28g8N62yOjR0bwMX3Y8qkpBggc8KDo8uYvDi4iVfOvELDzw/9Yxz5q8bM3LcvtLCcS2nnPMvLw8bMab1hBOn1s+dNa0+M6psXywjf8euqbOXP/rTi+ae+fWF8UjbsFBDfeHwwvKKouLyyorqQyOLi0d+OLpsZMvE8SXNI/ODbYGApkEZyvQtkvJJ2+Xfu+r6uTf+94r5p1+wfs68hRt+H/n+mTOmLNgVdO5f31s+7/k1z5xx6YKb/n7Rpy9eM+OMz69XVepTQAEiUmH0YZCsj4HvAFOYNZvJp0Dhl2nKa6A8H/KH98aYFAYGsb6XQo5KCpBPP+egphoa6mFwHndIczM0NLhcpxmChxIF+lFi+B4UloLXuZPVeVBdCbHBLZXXVAPlpZDfaXqm1lYIV0HH59HZE1F4STeO4LdI/2U+XLoQT37q8Z/vOnLF+bTbUgfnLGDVx+/yg6v/sO7Qe//DP2oXsG3PInvvje/xt8UfMabS5T/++2vsu/yHlN5xOz98p5gtp9Xwyw/yvYFvf/P2Gs6/8Sy+OKuSoJVaUXOIs//nPJe+/xfmfXA+Hz/++SHzQ6iGfzpzjq3lhXQ6fz1JU/Idd93F9TFc5MfXL9p1S/c9H1mz40CVb8IYXvvdrZc9P+Pkee+8Pmfcnu/9y6p5Dz5Y9Y/fvvGHW3dE3GljAm7Yuw+z7+dXcFnZJCZ82+OJJ4dV/vr2S6+86dprLxp2wqfYcvd6bn7gZq75ZQ4vfO18XnnwZi6YfTY/vfFVfvn2Xn74wHlUfHwR9//2Bs58ehTfeOh+Hrn0h+fXvP8v936zMX5B5/swwrGcYbV1bxTUNddTTxXffaGV3z25jtfW18Nof3Df9FtpHj2SVet2sLc2jxyPxr31fH3hC+bNKrvVOT/Zl1SfR9fKy6+b+pMD9fWu5kDDlleeq/z22Ilzfr9lU+W0//j+Eze+/uKNX5tX+eYZX//6uI/fW/OlcFvboqV/+d2vvjA2zrPPWtVbfGVZNOoNDwZdcTzcVFfX1tLcEo76wcCI4kJvTPEwJhUXkjM8DPsa2N9S42pD+bRkHHm+IzCyJFg8Kte+zFgWz5z0yw2zz/3SYnv8ue/cefZU//IvTP767qLhP3z2mQ2Lqndv/K9vXnrBl1bW1f9m44o/1o8YW3rn5h3rDlVX13xt195t3xo5etK0vzy/HJozGTz8SBTijblO069JfylAPiGMQE6wYBa52amiMXO0d+Bv0/+5qnG9v2lrJeXFJDH4x7pdBwCF+SXDp9uE0bUZvMwIfp4JjDRfYvE4vmdkMo5YzGFmODNcLN7+Bs/zDGdhYnGHmbWfsWKOaAxicUMsVY7BDJWjkQJEJMGRH/dKZEhQgIgkUIBImyOxnPLhe0I7Ur+EdCIl0iFSuqYAEUmgABlyfGzDJldw22rLfXFVIDnvnXSGt5x/cQdKXN7hx2oNsMT1BsadkQH27nMdVu/4OYBwvP0aRbLHR9uT3lfedkKpv3LS8ePPmTt7St783ITpuEU/bQqQIeiqL571zqafv/LDXzGtBZrS3JbpecnvdwTapx7rbq0OpbE0aSk9/D5nHQVvRnxqM7WM9p2x03U7/WKQV2wUFJVdOCJ0wS9u/fbFsyYXXtR5Lg/pOY2LNRS5/LuefXLTl66/5aF/+Wl1FcHsLN3x1mFJn0tXOBe5Z9UG9r67PzfPG+COJOE3ioKiEZV+QV5xIEDY95ymuusdnUGGLOfdduXk4vvefOiSsadsuub2y9//xe07uWz2dTXeF2fn/GPXS+5gizv3p28w//vf5Yb/+uH4dzPR7zBh0hO/vOX6f5t8IhlNQdl/CpAhzDmuueiyq/e//+Rtmy5Yff//7t/9i5t/dcndb1V9ceu2uu2J6ztXMCw39PXRo0f7c/OTn80HIFrDSWNG5t5ZNdVPOzWw9JkCZKhzeJZjX7rsBvY8/iu3pebL9+ytOvOlx5s6rbR1lYu7QFlZaUFxJJI0YLXZl6JRf/qpJ5T4dNMHLX2nABkqnvghj72e5vlFd2zGtd82JCnwfX/MtGnTTr7gnJPnFg4v2GhmTcnrVWxhysRJ8T+ce/r0Me1P7Pv7C5BphGMqXv6EKbtxxbN+c3Nn39jSGvnG2Q+WjZl9+dXPJ7zdGZ5nFAeDXkE8GotHwnEOvP/8c4erN1+Rnw+ZLqbD6uqUZjaqKL93j9+lXwoQadfFvKOeZ2Xlkyd9fdmyvgfgVz/5cxbN+tybb+7aVnPG/xm1jMXvvNPzE36N3CHdUIA8sXTpzvnnnl3IrBnbXSYjQ8ynwqgRueWzZsya/Oef/PTcN996x5jQYiSNZC59owB5p7I1/OxL7+5etXbTzJqJkyKjpZdJvjDOuYHcEOgcTJ1S5p86d86kESPzMDOcc4MYI+q1S6YAEZEE+heKJFCAiCRQgIgkUIBkl6ZXk/8fKEBEEihARBLomUgWeZYT9nPaxmR7u9qTPBTpNwWIiCRQgIgkUIB8ypnZQHsvjmbu6P6NlO7pkn4I8H3/YElJyb4sbU5zG2cBzVwizekM0kOBgP9BSWnp1qXL3v9I9+dLNugM0kN+wPfbqt9cMbp02a5dPOCc02NQ6TcFSA/5fsBr2VZ9MDe/sD43N7cdQB1n0l86lYsk0G+QSAIFiEgCBYhIAgWISAIFiEgCBYhIgv8DzLt8v4+oC+IAAAAASUVORK5CYII=" alt="Drama Llama Logo" />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" alt="Drama Llama Logo" />
              </div>
              <div class="header-text">
                <h1>Drama Llama AI</h1>
                <p>Conversation Analysis Report</p>
                <p>Generated on: ${new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</p>
              </div>
            </div>
            
            <div class="document-title">
              Chat Analysis Results
            </div>
            
            <div class="document-section">
              <div class="section-title">Overall Tone</div>
              <div class="section-content">
                ${result.toneAnalysis.overallTone}
              </div>
            </div>
            
            ${result.healthScore ? `
            <div class="document-section">
              <div class="section-title">Conversation Health</div>
              <div class="health-score">
                <div class="health-score-label">Health Score:</div>
                <div class="health-score-value health-score-${result.healthScore.color}">
                  ${result.healthScore.label} (${Math.min(10, result.healthScore.score)}/10)
                </div>
              </div>
            </div>
            ` : ''}
            
            ${result.redFlagsCount !== undefined ? `
            <div class="document-section">
              <div class="section-title">Red Flags</div>
              <div class="section-content">
                <p>
                  <span class="red-flags-count">
                    ${result.redFlagsCount} potential red flag${result.redFlagsCount !== 1 ? 's' : ''}
                  </span> ${result.redFlagsCount === 0 ? 'were' : 'was'} identified in this conversation.
                  ${result.redFlagsCount > 0 ? ' Upgrade to see detailed analysis of each red flag.' : ''}
                </p>
              </div>
            </div>
            ` : ''}
            
            ${result.communication && result.communication.patterns ? `
            <div class="document-section">
              <div class="section-title">Communication Patterns</div>
              <div class="section-content">
                <ul class="pattern-list">
                  ${result.communication.patterns.map(pattern => `
                  <li class="pattern-item">${pattern}</li>
                  `).join('')}
                </ul>
              </div>
            </div>
            ` : ''}
            
            <div class="document-footer">
              <p>This analysis was generated by Drama Llama AI.</p>
              <p>Results should be interpreted as general guidance only.</p>
            </div>
          </div>
        </body>
        </html>
      `;
      
      // Show the formal document in a modal
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/80 flex flex-col z-50 p-0 md:p-4';
      
      modal.innerHTML = `
        <div class="bg-white rounded-lg w-full h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden">
          <div class="p-3 flex justify-between items-center bg-primary text-white">
            <h3 class="text-lg font-bold">Drama Llama Analysis</h3>
            <div class="flex items-center">
              <button id="download-document" class="px-3 py-1 bg-white/20 text-sm rounded mr-2">
                Download
              </button>
              <button id="close-document-preview" class="px-3 py-1 bg-white/20 text-sm rounded">
                Close
              </button>
            </div>
          </div>
          <div class="flex-1 overflow-auto p-0 bg-white" id="document-preview-container"></div>
        </div>
      `;
      
      document.body.appendChild(modal);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
      
      // Set the document preview
      const previewContainer = document.getElementById('document-preview-container');
      if (previewContainer) {
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        previewContainer.appendChild(iframe);
        
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          iframeDoc.open();
          iframeDoc.write(formalDocumentContent);
          iframeDoc.close();
        }
      }
      
      // Add download handler
      document.getElementById('download-document')?.addEventListener('click', () => {
        try {
          // Create a blob from the HTML content - this is what makes it downloadable
          const blob = new Blob([formalDocumentContent], { type: 'text/html' });
          
          // Create a downloadable URL
          const url = URL.createObjectURL(blob);
          
          // Create a mobile-friendly download approach
          toast({
            title: "Downloading Report",
            description: "Preparing your Drama Llama analysis report...",
            duration: 2000,
          });
          
          // First try direct download with link click
          const downloadLink = document.createElement('a');
          downloadLink.href = url;
          downloadLink.download = `drama-llama-analysis-${new Date().toISOString().split('T')[0]}.html`;
          downloadLink.style.display = 'none';
          document.body.appendChild(downloadLink);
          
          // This triggers the download in most browsers including mobile
          downloadLink.click();
          
          // Clean up
          setTimeout(() => {
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(url);
          }, 100);
          
          // Show additional instructions for mobile users
          const mobileInstructions = document.createElement('div');
          mobileInstructions.className = 'fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-[60] p-4';
          
          mobileInstructions.innerHTML = `
            <div class="bg-white rounded-lg w-full max-w-md p-5 flex flex-col">
              <h3 class="text-lg font-bold mb-2 text-center">Download Instructions</h3>
              <p class="text-sm mb-4 text-center">For mobile devices:</p>
              <ol class="text-sm mb-4 ml-5 list-decimal">
                <li class="mb-2">If a download prompt appears, tap "Download"</li>
                <li class="mb-2">If the report opens in a new tab, tap and hold on the page and select "Save" or "Download"</li>
                <li class="mb-2">On some devices, you may need to tap the "..." menu and select "Download"</li>
              </ol>
              <div class="text-sm mb-4 p-3 bg-blue-50 rounded">
                <p class="font-bold">Trouble downloading?</p>
                <p>You can also view the report in the preview window and take screenshots</p>
              </div>
              <button id="close-mobile-instructions" class="px-4 py-2 bg-primary text-white rounded self-center">
                Got it
              </button>
            </div>
          `;
          
          // Add to DOM after a short delay to ensure the download starts first
          setTimeout(() => {
            document.body.appendChild(mobileInstructions);
            
            // Add close handler
            document.getElementById('close-mobile-instructions')?.addEventListener('click', () => {
              document.body.removeChild(mobileInstructions);
            });
          }, 1000);
          
        } catch (err) {
          console.error("Download failed:", err);
          toast({
            title: "Download Failed",
            description: "Please try viewing the document in a browser and saving it manually",
            variant: "destructive",
          });
        }
      });
      
      // Add close handler
      document.getElementById('close-document-preview')?.addEventListener('click', () => {
        document.body.removeChild(modal);
        document.body.style.overflow = ''; // Restore scrolling
      });
      
      // Remove the temporary container
      document.body.removeChild(tempContainer);
      
    } catch (error) {
      console.error("Document export failed:", error);
      toast({
        title: "Export Failed",
        description: "Please try taking screenshots instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  // Extremely simplified screenshot feature for mobile compatibility
  const exportAsImage = async () => {
    if (!resultsRef.current || !result) {
      toast({
        title: "Screenshot Failed",
        description: "Could not create image. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsExporting(true);
      
      toast({
        title: "Creating Image",
        description: "Please wait...",
        duration: 3000,
      });
      
      try {
        // Generate image with minimal settings for better mobile compatibility
        const element = resultsRef.current;
        const dataUrl = await toJpeg(element, { 
          cacheBust: true,
          quality: 0.8,
          backgroundColor: 'white',
          canvasWidth: 1000,
          pixelRatio: 1
        });
        
        // Skip trying to download directly, just show the image for saving
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/95 flex flex-col z-50';
        
        modal.innerHTML = `
          <div class="p-3 flex justify-between items-center bg-gray-900 text-white">
            <h3 class="text-sm font-bold">Long-press on image to save</h3>
            <button id="close-fullscreen-image" class="px-3 py-1 bg-gray-700 text-sm rounded">
              Close
            </button>
          </div>
          <div class="flex-1 overflow-auto flex items-center justify-center">
            <img src="${dataUrl}" alt="Analysis Result" class="max-w-full" />
          </div>
        `;
        
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
        
        // Add close handler
        document.getElementById('close-fullscreen-image')?.addEventListener('click', () => {
          document.body.removeChild(modal);
          document.body.style.overflow = ''; // Restore scrolling
        });
        
        toast({
          title: "Screenshot Ready",
          description: "Long-press on the image to save it to your phone",
          duration: 5000,
        });
        
      } catch (error) {
        console.error("Screenshot generation failed:", error);
        toast({
          title: "Screenshot Failed",
          description: "Please try taking a manual screenshot instead.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Image export error:", error);
      toast({
        title: "Screenshot Failed",
        description: "Please try taking a manual screenshot instead.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div ref={resultsRef} className="mb-4 p-4 bg-white border rounded-lg shadow-sm">
      <div className="flex flex-col gap-6">
        {/* Free Tier Summary Section */}
        <div>
          <h4 className="font-medium mb-3">Conversation Summary</h4>
          <div className="flex flex-col gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <h5 className="text-sm font-medium text-muted-foreground mb-1">Overall Tone</h5>
              <p className="text-2xl font-semibold">
                {result.toneAnalysis?.overallTone?.split(".")[0] || "Neutral"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {result.toneAnalysis?.overallTone?.includes(".") ? 
                  result.toneAnalysis.overallTone.substring(result.toneAnalysis.overallTone.indexOf('.')+1).trim() :
                  "This conversation shows signs of emotional strain."}
              </p>
            </div>
          </div>
        </div>
        
        {/* Participant Summary removed from Free Tier */}
        
        {/* Free Tier Health Meter */}
        <div>
          <h4 className="font-medium mb-3">Conversation Health Meter</h4>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex flex-col items-center mb-4">
              <div className="relative w-full h-12 bg-white border border-gray-200 rounded-full overflow-hidden">
                {/* Tick marks - 20%, 40%, 60%, 80% */}
                <div className="absolute w-0.5 h-3 bg-gray-300 top-[50%] transform -translate-y-1/2 left-[20%]"></div>
                <div className="absolute w-0.5 h-3 bg-gray-300 top-[50%] transform -translate-y-1/2 left-[40%]"></div>
                <div className="absolute w-0.5 h-3 bg-gray-300 top-[50%] transform -translate-y-1/2 left-[60%]"></div>
                <div className="absolute w-0.5 h-3 bg-gray-300 top-[50%] transform -translate-y-1/2 left-[80%]"></div>
                
                {/* Progress bar showing dynamic health score */}
                <div className="absolute h-6 top-[50%] transform -translate-y-1/2 left-0 rounded-full" 
                  style={{
                    width: `${result.healthScore ? Math.min(100, result.healthScore.score) : 50}%`,
                    background: `linear-gradient(to right, 
                      #ef4444 0%, 
                      #f59e0b 40%, 
                      #84cc16 70%, 
                      #22c55e 100%
                    )`
                  }}
                ></div>
              </div>
              
              {/* Meter scale */}
              <div className="flex justify-between items-center w-full text-xs text-gray-500 mt-2 px-2">
                <span>Conflict</span>
                <span>Moderate</span>
                <span>Very Healthy</span>
              </div>
            </div>
            
            {/* Score display */}
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {result.healthScore ? result.healthScore.score : 50}<span className="text-sm font-normal text-gray-500">/100</span>
              </div>
              <p className="text-sm mt-2 text-gray-700">
                {result.healthScore && result.healthScore.score >= 80 ? 'Healthy communication with mutual respect.' :
                  result.healthScore && result.healthScore.score >= 60 ? 'Generally positive with some areas for improvement.' :
                  result.healthScore && result.healthScore.score >= 40 ? 'Moderate to High Tension' :
                  'Significant tension present, needs attention.'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Free Tier Sample Quote */}
        {result.keyQuotes && result.keyQuotes.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Sample Quote</h4>
            <Card className="shadow-none">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-2 w-2 rounded-full" 
                      style={{ 
                        backgroundColor: result.keyQuotes[0].speaker === me ? '#22C9C9' : '#FF69B4'
                      }}
                    ></div>
                    <span className="font-medium" style={{ 
                      color: result.keyQuotes[0].speaker === me ? '#22C9C9' : '#FF69B4'
                    }}>
                      {result.keyQuotes[0].speaker}
                    </span>
                  </div>
                  <div className="pl-4 border-l-2" style={{ 
                    borderColor: result.keyQuotes[0].speaker === me ? '#22C9C9' : '#FF69B4' 
                  }}>
                    <p className="italic text-gray-600">"{result.keyQuotes[0].quote}"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Red Flags Section */}
        {result.healthScore && (
          <>
            {/* Zero Red Flags - Green success message */}
            {(result.redFlagsCount === 0) && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-100 mb-4">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h4 className="text-lg font-medium text-green-700">
                    No Red Flags Detected
                  </h4>
                </div>
                <p className="mt-2 ml-7 text-sm text-green-600">
                  This conversation appears healthy with positive communication patterns.
                </p>
              </div>
            )}
            
            {/* Red Flags Detected - Only shown when health score is below 80 and there are red flags */}
            {(result.healthScore.score < 80 && (result.redFlagsCount !== undefined && result.redFlagsCount > 0)) && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-100 mb-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-medium text-red-700">
                    Red Flags Detected: {
                      // Show real count if available, otherwise determine based on health score
                      result.redFlagsCount !== undefined ? result.redFlagsCount : 
                      result.healthScore.score < 40 ? 3 : 
                      result.healthScore.score < 60 ? 2 : 1
                    }
                  </h4>
                </div>
                
                {/* Specific pattern indicators based on red flags and health score */}
                <div className="mt-3 mb-3">
                  <ul className="text-sm text-red-600 space-y-1.5">
                    {/* More intelligent detection of communication patterns based on overall tone */}
                    {(() => {
                      // Get the lowercase overall tone for pattern matching
                      const tone = result.toneAnalysis?.overallTone?.toLowerCase() || '';
                      const patterns = result.communication?.patterns || [];
                      const patternsText = patterns.join(' ').toLowerCase();
                      
                      // Create an array to store detected issues
                      const detectedIssues = [];
                      
                      // Check for manipulation patterns
                      if (tone.includes('manipulat') || 
                          tone.includes('control') || 
                          patternsText.includes('manipulat') ||
                          result.healthScore.score < 30) {
                        detectedIssues.push(
                          <li key="manipulation" className="flex items-center">
                            <span className="mr-1.5">•</span> Manipulation patterns detected
                          </li>
                        );
                      }
                      
                      // Check for gaslighting
                      if (tone.includes('gaslight') || 
                          tone.includes('reality distort') || 
                          tone.includes('making you doubt') ||
                          tone.includes('question your reality') ||
                          patternsText.includes('gaslight') ||
                          result.healthScore.score < 35) {
                        detectedIssues.push(
                          <li key="gaslighting" className="flex items-center">
                            <span className="mr-1.5">•</span> Gaslighting behaviors detected
                          </li>
                        );
                      }
                      
                      // Check for passive-aggressive behavior
                      if (tone.includes('passive-aggress') || 
                          tone.includes('passive aggress') ||
                          tone.includes('indirect hostil') ||
                          patternsText.includes('passive') && patternsText.includes('aggress')) {
                        detectedIssues.push(
                          <li key="passive-aggressive" className="flex items-center">
                            <span className="mr-1.5">•</span> Passive-aggressive communication detected
                          </li>
                        );
                      }
                      
                      // Check for love-bombing
                      if (tone.includes('love bomb') || 
                          tone.includes('excessive affection') ||
                          tone.includes('overwhelming attention') ||
                          patternsText.includes('love bomb')) {
                        detectedIssues.push(
                          <li key="love-bombing" className="flex items-center">
                            <span className="mr-1.5">•</span> Love-bombing patterns detected
                          </li>
                        );
                      }
                      
                      // Check for trauma-bonding
                      if (tone.includes('trauma') || 
                          tone.includes('cycle of abuse') ||
                          tone.includes('intermittent reinforcement') ||
                          patternsText.includes('trauma bond')) {
                        detectedIssues.push(
                          <li key="trauma-bonding" className="flex items-center">
                            <span className="mr-1.5">•</span> Trauma-bonding patterns detected
                          </li>
                        );
                      }
                      
                      // Check for victim blaming
                      if (tone.includes('blame') || 
                          tone.includes('fault') ||
                          tone.includes('guilt') && tone.includes('shift') ||
                          tone.includes('responsib') && (tone.includes('deflect') || tone.includes('avoid'))) {
                        detectedIssues.push(
                          <li key="victim-blaming" className="flex items-center">
                            <span className="mr-1.5">•</span> Victim-blaming behaviors detected
                          </li>
                        );
                      }
                      
                      // Check for narcissistic traits
                      if (tone.includes('narciss') || 
                          tone.includes('self-center') ||
                          tone.includes('grandiose') ||
                          tone.includes('entitle') ||
                          patternsText.includes('narciss')) {
                        detectedIssues.push(
                          <li key="narcissism" className="flex items-center">
                            <span className="mr-1.5">•</span> Narcissistic behavior patterns detected
                          </li>
                        );
                      }
                      
                      // Check for parental conflict
                      if (tone.includes('parent') || 
                          tone.includes('child') && tone.includes('conflict') ||
                          tone.includes('custody') ||
                          patternsText.includes('co-parent')) {
                        detectedIssues.push(
                          <li key="parental-conflict" className="flex items-center">
                            <span className="mr-1.5">•</span> Co-parenting conflict detected
                          </li>
                        );
                      }
                      
                      // Check for aggression/hostility/violence
                      if (tone.includes('aggress') || 
                          tone.includes('hostile') || 
                          tone.includes('violen') || 
                          tone.includes('threat') || 
                          tone.includes('abus') ||
                          tone.includes('intimi') ||
                          tone.includes('coerci')) {
                        detectedIssues.push(
                          <li key="aggression" className="flex items-center">
                            <span className="mr-1.5">•</span> Extreme aggression or hostility detected
                          </li>
                        );
                      }
                      
                      // Check for emotional blackmail
                      if (tone.includes('blackmail') || 
                          tone.includes('guilt trip') ||
                          tone.includes('emotional manipulat')) {
                        detectedIssues.push(
                          <li key="emotional-blackmail" className="flex items-center">
                            <span className="mr-1.5">•</span> Emotional blackmail detected
                          </li>
                        );
                      }
                      
                      // Check for power imbalance
                      if (tone.includes('power imbalance') || 
                          tone.includes('control') ||
                          tone.includes('dominat') ||
                          tone.includes('submission') ||
                          tone.includes('coerci')) {
                        detectedIssues.push(
                          <li key="power-imbalance" className="flex items-center">
                            <span className="mr-1.5">•</span> Power imbalance detected
                          </li>
                        );
                      }
                      
                      // If we have too many detected issues, show only the most significant ones
                      // to avoid overwhelming the user with redundant information
                      if (detectedIssues.length > 3) {
                        return detectedIssues.slice(0, 3);
                      }
                      
                      // If we have no detected issues but a poor health score,
                      // show a generic warning based on health score
                      if (detectedIssues.length === 0 && result.healthScore.score < 50) {
                        return [
                          <li key="general-concern" className="flex items-center">
                            <span className="mr-1.5">•</span> Concerning interaction patterns detected
                          </li>
                        ];
                      }
                      
                      return detectedIssues;
                    })()}
                  </ul>
                </div>
                
                <p className="text-sm text-red-600 mb-3">
                  Get detailed insights about these patterns and recommended responses:
                </p>
                
                {/* Upgrade buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300 flex-1"
                    onClick={() => window.location.href = '/pricing'}
                  >
                    Upgrade Here
                  </Button>
                  <Button 
                    variant="outline"
                    className="bg-purple-100 hover:bg-purple-200 text-purple-800 border-purple-300 flex-1"
                    onClick={() => window.location.href = '/instant-deep-dive'}
                  >
                    One Time Insight
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
        
        {/* Export Buttons */}
        <div className="flex justify-end mb-4">
          <Button
            onClick={exportToPdf}
            disabled={isExporting}
            className="mr-2"
            variant="outline"
          >
            {isExporting ? 'Creating...' : 'Create Formal Report'}
          </Button>
          <Button 
            variant="outline"
            onClick={exportAsImage}
            disabled={isExporting}
          >
            {isExporting ? 'Creating...' : 'View as Image'}
          </Button>
        </div>
        
        {/* Upgrade CTA */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-2">
          <h4 className="font-medium text-blue-800 mb-2">Want deeper insights?</h4>
          <p className="text-blue-700 mb-3">
            Unlock full communication patterns, risk assessments, and style breakdowns with Drama Llama AI Personal Plan – Just £3.99/month
          </p>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Upgrade to Personal
          </Button>
        </div>
      </div>
    </div>
  );
}