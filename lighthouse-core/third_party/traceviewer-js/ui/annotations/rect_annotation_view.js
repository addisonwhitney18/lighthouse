"use strict";
/**
Copyright (c) 2015 The Chromium Authors. All rights reserved.
Use of this source code is governed by a BSD-style license that can be
found in the LICENSE file.
**/

require("./annotation_view.js");

'use strict';

global.tr.exportTo('tr.ui.annotations', function () {
  /**
   * A view responsible for drawing a single highlight rectangle box on
   * the timeline.
   * @extends {AnnotationView}
   * @constructor
   */
  function RectAnnotationView(viewport, annotation) {
    this.viewport_ = viewport;
    this.annotation_ = annotation;
  }

  RectAnnotationView.prototype = {
    __proto__: tr.ui.annotations.AnnotationView.prototype,

    draw: function (ctx) {
      var dt = this.viewport_.currentDisplayTransform;
      var startCoords = this.annotation_.startLocation.toViewCoordinates(this.viewport_);
      var endCoords = this.annotation_.endLocation.toViewCoordinates(this.viewport_);

      // Prevent drawing into the ruler track by clamping the initial Y
      // point and the rect's Y size.
      var startY = startCoords.viewY - ctx.canvas.getBoundingClientRect().top;
      var sizeY = endCoords.viewY - startCoords.viewY;
      if (startY + sizeY < 0) {
        // In this case sizeY is negative. If final Y is negative,
        // overwrite startY so that the rectangle ends at y=0.
        startY = sizeY;
      } else if (startY < 0) {
        startY = 0;
      }

      ctx.fillStyle = this.annotation_.fillStyle;
      ctx.fillRect(startCoords.viewX, startY, endCoords.viewX - startCoords.viewX, sizeY);
    }
  };

  return {
    RectAnnotationView: RectAnnotationView
  };
});