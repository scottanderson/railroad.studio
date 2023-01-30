import {Studio} from './Studio';

export function exportImage(studio: Studio) {
    let svgNode = document.querySelector('svg.map-svg') as SVGElement;
    if (!svgNode) {
        throw new Error('Missing svg node');
    }
    svgNode = svgNode.cloneNode(true) as SVGElement;
    svgNode.setAttribute('width', '4000');
    svgNode.setAttribute('height', '4000');
    // Scale the map to the correct size and position
    const viewport = svgNode.querySelector('g.svg-pan-zoom_viewport');
    if (!viewport) {
        throw new Error('Missing viewport');
    }
    viewport.removeAttribute('transform');
    // Inverse transform of matrix(-116.75,0,0,-116.75,233700,231900) to fit the topo map
    // viewport.setAttribute('style', 'transform: matrix(' +
    //     '0.0085653104925054, 0, 0, 0.0085653104925054, ' +
    //     '2001.713, 1986.296)');
    // Alternately, use map borders
    viewport.setAttribute('style', 'transform: matrix(0.01, 0, 0, 0.01, 2000, 2000);');
    const inputWidth = 4000;
    const inputHeight = 4000;
    const outputWidth = 4000;
    const outputHeight = 4000;
    // Remove hidden layers to speed things up
    svgNode.querySelectorAll('g[style*="display: none"]').forEach((v) => v.parentNode?.removeChild(v));
    const isExternal = (url: string) =>
        url && url.lastIndexOf('http', 0) === 0 && url.lastIndexOf(window.location.host) === -1;
    const inlineImages = (el: SVGElement, callback: Function) => {
        const images = el.querySelectorAll('image');
        let left = images.length;
        if (left) {
            console.log(`Inlining ${left} images...`);
        }
        const checkDone = function() {
            if (left === 0) {
                callback();
            }
        };
        checkDone();
        for (let i = 0; i < images.length; i++) {
            (function(image) {
                let href = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
                if (href) {
                    if (isExternal(href)) {
                        console.warn('Cannot render embedded images linking to external hosts: ' + href);
                        return;
                    }
                }
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    console.warn('Unable to get canvas context');
                    return;
                }
                const img = new Image();
                href = href || image.getAttribute('href');
                if (href) {
                    img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                        image.setAttributeNS('http://www.w3.org/1999/xlink',
                            'href', canvas.toDataURL('image/png'));
                        left--;
                        checkDone();
                    };
                    img.onerror = () => {
                        console.log('Could not load ' + href);
                        left--;
                        checkDone();
                    };
                    img.src = href;
                } else {
                    left--;
                    checkDone();
                }
            })(images[i]);
        }
    };
    // Inline style.css
    const sheet = document.styleSheets[0];
    const styleRules = [];
    for (let i = 0; i < sheet.cssRules.length; i++) {
        styleRules.push(sheet.cssRules.item(i)?.cssText);
    }
    const style = document.createElement('style');
    style.type = 'text/css';
    style.appendChild(document.createTextNode(styleRules.join(' ')));
    svgNode.insertBefore(style, svgNode.firstChild);
    // Inline images
    studio.setTitle('Fetching external images...');
    inlineImages(svgNode, () => {
        studio.setTitle('Building SVG image...');
        const img = new Image();
        img.width = inputWidth;
        img.height = inputHeight;
        img.onload = () => {
            studio.setTitle('Exporting...');
            const canvas = document.createElement('canvas');
            canvas.width = outputWidth;
            canvas.height = outputHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                throw new Error('Missing context');
            }
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (!blob) {
                    return;
                }
                const url = URL.createObjectURL(blob);
                const filename = (studio.filename.endsWith('.sav') ?
                    studio.filename.slice(0, studio.filename.length - 4) :
                    studio.filename) + '.png';
                const downloadLink = document.createElement('a');
                downloadLink.setAttribute('download', filename);
                downloadLink.setAttribute('href', url);
                downloadLink.click();
                console.log({url});
                studio.setTitle('Export complete');
            });
        };
        img.onerror = () => studio.setTitle('Failed to load ' + svgUrl);
        const svgXml = new XMLSerializer().serializeToString(svgNode);
        const svgBlob = new Blob([svgXml], {type: 'image/svg+xml;charset=utf-8'});
        const svgUrl = window.URL.createObjectURL(svgBlob);
        img.src = svgUrl;
    });
}
