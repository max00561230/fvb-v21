# v22.3 Photo Placement Repair Acceptance Report

## Root Cause

Uploaded photos were initialized through a separate marked-region workflow and were not selected as foreground Fabric objects after upload. Canvas zoom was applied with a CSS transform outside Fabric, which could desynchronize pointer coordinates from page/object coordinates. Touch scrolling was also allowed on the canvas area, competing with direct photo manipulation.

## Files Changed

- src/components/PhotoRestoration.tsx
- src/styles-phase1.css
- scripts/photo-placement-v22-3-acceptance.mjs
- qa/v22.3-photo-placement-repair/*

## Preview URL

http://127.0.0.1:4179

## Screenshots

- screenshot immediately after upload: qa/v22.3-photo-placement-repair/screenshots/01-after-jpeg-upload.png
- screenshot after dragging: qa/v22.3-photo-placement-repair/screenshots/02-after-mouse-drag-upper-left.png
- screenshot after resizing: qa/v22.3-photo-placement-repair/screenshots/03-after-corner-resize.png
- screenshot after resizing/rotating: qa/v22.3-photo-placement-repair/screenshots/04-after-resize-rotate.png
- mobile touch test screenshot: qa/v22.3-photo-placement-repair/screenshots/05-mobile-touch-drag.png

## Results

- PASS: Select visible Page 10 - Page 10 · page-012 · page-12.png
- PASS: JPEG upload places editable photo - {"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":336.126,"top":615.968,"width":448.063,"height":308.617,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":112.095,"top":461.66,"width":448.063,"height":308.617},"controls":{"br":{"x":560.158,"y":770.277},"tr":{"x":560.158,"y":461.66},"bl":{"x":112.095,"y":770.277},"tl":{"x":112.095,"y":461.66}}}
- PASS: Corner handle resize changes Fabric object size - {"before":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":336.126,"top":615.968,"width":448.063,"height":308.617,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":112.095,"top":461.66,"width":448.063,"height":308.617},"controls":{"br":{"x":560.158,"y":770.277},"tr":{"x":560.158,"y":461.66},"bl":{"x":112.095,"y":770.277},"tl":{"x":112.095,"y":461.66}}},"after":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":288.696,"top":583.399,"width":353.202,"height":243.478,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":112.095,"top":461.66,"width":353.202,"height":243.478},"controls":{"br":{"x":465.296,"y":705.138},"tr":{"x":465.296,"y":461.66},"bl":{"x":112.095,"y":705.138},"tl":{"x":112.095,"y":461.66}}}}
- PASS: Mouse drag moves actual Fabric photo object - {"before":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":336.126,"top":615.968,"width":448.063,"height":308.617,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":112.095,"top":461.66,"width":448.063,"height":308.617},"controls":{"br":{"x":560.158,"y":770.277},"tr":{"x":560.158,"y":461.66},"bl":{"x":112.095,"y":770.277},"tl":{"x":112.095,"y":461.66}}},"after":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":246.008,"top":505.929,"width":448.063,"height":308.617,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":21.976,"top":351.621,"width":448.063,"height":308.617},"controls":{"br":{"x":470.04,"y":660.237},"tr":{"x":470.04,"y":351.621},"bl":{"x":21.976,"y":660.237},"tl":{"x":21.976,"y":351.621}}}}
- PASS: Rotate control changes Fabric object angle - {"beforeRotate":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":246.008,"top":505.929,"width":448.063,"height":308.617,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":21.976,"top":351.621,"width":448.063,"height":308.617},"controls":{"br":{"x":470.04,"y":660.237},"tr":{"x":470.04,"y":351.621},"bl":{"x":21.976,"y":660.237},"tl":{"x":21.976,"y":351.621}}},"afterRotate":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":246.008,"top":505.929,"width":448.063,"height":308.617,"angle":5,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":9.38,"top":332.682,"width":473.256,"height":346.494},"controls":{"br":{"x":455.738,"y":679.176},"tr":{"x":482.636,"y":371.733},"bl":{"x":9.38,"y":640.124},"tl":{"x":36.278,"y":332.682}}}}
- PASS: Zoom changes view without changing object placement - {"beforeZoom":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":246.008,"top":505.929,"width":448.063,"height":308.617,"angle":5,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":9.38,"top":332.682,"width":473.256,"height":346.494},"controls":{"br":{"x":455.738,"y":679.176},"tr":{"x":482.636,"y":371.733},"bl":{"x":9.38,"y":640.124},"tl":{"x":36.278,"y":332.682}}},"afterZoom":{"objects":["background","photo"],"activeRole":"photo","zoom":1.4,"left":246.008,"top":505.929,"width":448.063,"height":308.617,"angle":5,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":9.38,"top":332.682,"width":473.256,"height":346.494},"controls":{"br":{"x":638.033,"y":950.846},"tr":{"x":675.69,"y":520.427},"bl":{"x":13.132,"y":896.174},"tl":{"x":50.789,"y":465.755}}}}
- PASS: Saved draft remains associated with Page 10 - {"pageId":"page-012","displayNumber":10,"x":0.21964991530208922,"y":0.3284746458632724}
- PASS: PNG upload places editable photo - {"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":336.126,"top":628.3,"width":448.063,"height":283.953,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":112.095,"top":486.324,"width":448.063,"height":283.953},"controls":{"br":{"x":560.158,"y":770.277},"tr":{"x":560.158,"y":486.324},"bl":{"x":112.095,"y":770.277},"tl":{"x":112.095,"y":486.324}}}
- PASS: WEBP upload places editable photo - {"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":357.312,"top":462.292,"width":405.692,"height":615.968,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":154.466,"top":154.308,"width":405.692,"height":615.968},"controls":{"br":{"x":560.158,"y":770.277},"tr":{"x":560.158,"y":154.308},"bl":{"x":154.466,"y":770.277},"tl":{"x":154.466,"y":154.308}}}
- PASS: Mobile touch drag moves actual Fabric photo object - {"before":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":357.312,"top":462.292,"width":405.692,"height":615.968,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":154.466,"top":154.308,"width":405.692,"height":615.968},"controls":{"br":{"x":560.158,"y":770.277},"tr":{"x":560.158,"y":154.308},"bl":{"x":154.466,"y":770.277},"tl":{"x":154.466,"y":154.308}}},"after":{"objects":["background","photo"],"activeRole":"photo","zoom":1,"left":312.312,"top":410.292,"width":405.692,"height":615.968,"angle":0,"selectable":true,"evented":true,"bgSelectable":false,"bgEvented":false,"screenRect":{"left":109.466,"top":102.308,"width":405.692,"height":615.968},"controls":{"br":{"x":515.158,"y":718.277},"tr":{"x":515.158,"y":102.308},"bl":{"x":109.466,"y":718.277},"tl":{"x":109.466,"y":102.308}}}}

Overall: PASS
