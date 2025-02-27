import React from "react";
import PropTypes from "prop-types";
import VictoryPortal from "../victory-portal/victory-portal";
import CustomPropTypes from "../victory-util/prop-types";
import Helpers from "../victory-util/helpers";
import LabelHelpers from "../victory-util/label-helpers";
import Style from "../victory-util/style";
import Log from "../victory-util/log";
import TSpan from "../victory-primitives/tspan";
import Text from "../victory-primitives/text";
import { assign, defaults, isEmpty } from "lodash";

const defaultStyles = {
  fill: "#252525",
  fontSize: 14,
  fontFamily: "'Gill Sans', 'Gill Sans MT', 'Ser­avek', 'Trebuchet MS', sans-serif",
  stroke: "transparent"
};

const getPosition = (props, dimension) => {
  if (!props.datum) {
    return 0;
  }
  const scaledPoint = Helpers.scalePoint(props, props.datum);
  return scaledPoint[dimension];
};

const getFontSize = (style) => {
  const baseSize = style && style.fontSize;
  if (typeof baseSize === "number") {
    return baseSize;
  } else if (baseSize === undefined || baseSize === null) {
    return defaultStyles.fontSize;
  } else if (typeof baseSize === "string") {
    const fontSize = +baseSize.replace("px", "");
    if (!isNaN(fontSize)) {
      return fontSize;
    } else {
      Log.warn("fontSize should be expressed as a number of pixels");
      return defaultStyles.fontSize;
    }
  }
  return defaultStyles.fontSize;
};

const getStyle = (props, style) => {
  style = style ? defaults({}, style, defaultStyles) : defaultStyles;
  const baseStyles = Helpers.evaluateStyle(style, props);
  return assign({}, baseStyles, { fontSize: getFontSize(baseStyles) });
};

const getStyles = (props) => {
  return Array.isArray(props.style) && !isEmpty(props.style)
    ? props.style.map((style) => getStyle(props, style))
    : [getStyle(props, props.style)];
};

const getHeight = (props, type) => {
  return Helpers.evaluateProp(props[type], props);
};

const getContent = (props) => {
  if (props.text === undefined || props.text === null) {
    return undefined;
  }
  if (Array.isArray(props.text)) {
    return props.text.map((line) => Helpers.evaluateProp(line, props));
  }
  const child = Helpers.evaluateProp(props.text, props);
  if (child === undefined || child === null) {
    return undefined;
  }
  return Array.isArray(child) ? child : `${child}`.split("\n");
};

const checkLineHeight = (lineHeight, val, fallbackVal) => {
  if (Array.isArray(lineHeight)) {
    return isEmpty(lineHeight) ? fallbackVal : val;
  }
  return lineHeight;
};

//eslint-disable-next-line max-params
const getDy = (props, style, content, lineHeight) => {
  style = Array.isArray(style) ? style[0] : style;
  lineHeight = checkLineHeight(lineHeight, lineHeight[0], 1);
  const fontSize = style.fontSize;
  const dy = props.dy ? Helpers.evaluateProp(props.dy, props) : 0;
  const length = content.length;
  const capHeight = getHeight(props, "capHeight");
  const verticalAnchor = style.verticalAnchor || props.verticalAnchor;
  const anchor = verticalAnchor ? Helpers.evaluateProp(verticalAnchor, props) : "middle";
  switch (anchor) {
    case "end":
      return dy + (capHeight / 2 + (0.5 - length) * lineHeight) * fontSize;
    case "middle":
      return dy + (capHeight / 2 + (0.5 - length / 2) * lineHeight) * fontSize;
    default:
      return dy + (capHeight / 2 + lineHeight / 2) * fontSize;
  }
};

const getTransform = (props, style) => {
  const { x, y, polar } = props;
  const defaultAngle = polar ? LabelHelpers.getPolarAngle(props) : 0;
  const baseAngle = style.angle === undefined ? props.angle : style.angle;
  const angle = baseAngle === undefined ? defaultAngle : baseAngle;
  const transform = props.transform || style.transform;
  const transformPart = transform && Helpers.evaluateProp(transform, props);
  const rotatePart = angle && { rotate: [angle, x, y] };
  return transformPart || angle ? Style.toTransformString(transformPart, rotatePart) : undefined;
};

const renderElements = (props, content) => {
  const { inline, className, title, desc, events, direction } = props;
  const style = getStyles(props);
  const lineHeight = getHeight(props, "lineHeight");
  const textAnchor = props.textAnchor ? Helpers.evaluateProp(props.textAnchor, props) : "start";
  const dx = props.dx ? Helpers.evaluateProp(props.dx, props) : 0;
  const dy = getDy(props, style, content, lineHeight);
  const transform = getTransform(props, style);
  const x = props.x !== undefined ? props.x : getPosition(props, "x");
  const y = props.y !== undefined ? props.y : getPosition(props, "y");

  const textChildren = content.map((line, i) => {
    const currentStyle = style[i] || style[0];
    const lastStyle = style[i - 1] || style[0];
    const fontSize = (currentStyle.fontSize + lastStyle.fontSize) / 2;
    const currentLineHeight = checkLineHeight(
      lineHeight,
      (lineHeight[i] + (lineHeight[i - 1] || lineHeight[0])) / 2,
      1
    );
    const tspanProps = {
      key: `${props.id}-key-${i}`,
      x: !inline ? props.x : undefined,
      dx,
      dy: i && !inline ? currentLineHeight * fontSize : undefined,
      textAnchor: currentStyle.textAnchor || textAnchor,
      style: currentStyle,
      children: line
    };
    return React.cloneElement(props.tspanComponent, tspanProps);
  });
  return React.cloneElement(
    props.textComponent,
    {
      ...events,
      direction,
      dx,
      dy,
      x,
      y,
      transform,
      className,
      title,
      desc,
      id: props.id
    },
    textChildren
  );
};

const VictoryLabel = (props) => {
  const content = getContent(props);
  if (content === null || content === undefined) {
    return null;
  }
  const label = renderElements(props, content);
  return props.renderInPortal ? <VictoryPortal>{label}</VictoryPortal> : label;
};

VictoryLabel.displayName = "VictoryLabel";
VictoryLabel.role = "label";
VictoryLabel.defaultStyles = defaultStyles;
VictoryLabel.propTypes = {
  active: PropTypes.bool,
  angle: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  capHeight: PropTypes.oneOfType([PropTypes.string, CustomPropTypes.nonNegative, PropTypes.func]),
  className: PropTypes.string,
  data: PropTypes.array,
  datum: PropTypes.any,
  desc: PropTypes.string,
  direction: PropTypes.oneOf(["rtl", "ltr", "inherit"]),
  dx: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.func]),
  dy: PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.func]),
  events: PropTypes.object,
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  index: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  inline: PropTypes.bool,
  labelPlacement: PropTypes.oneOf(["parallel", "perpendicular", "vertical"]),
  lineHeight: PropTypes.oneOfType([
    PropTypes.string,
    CustomPropTypes.nonNegative,
    PropTypes.func,
    PropTypes.array
  ]),
  origin: PropTypes.shape({
    x: CustomPropTypes.nonNegative,
    y: CustomPropTypes.nonNegative
  }),
  polar: PropTypes.bool,
  renderInPortal: PropTypes.bool,
  scale: PropTypes.shape({
    x: CustomPropTypes.scale,
    y: CustomPropTypes.scale
  }),
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  text: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.func, PropTypes.array]),
  textAnchor: PropTypes.oneOfType([
    PropTypes.oneOf(["start", "middle", "end", "inherit"]),
    PropTypes.func
  ]),
  textComponent: PropTypes.element,
  title: PropTypes.string,
  transform: PropTypes.oneOfType([PropTypes.string, PropTypes.object, PropTypes.func]),
  tspanComponent: PropTypes.element,
  verticalAnchor: PropTypes.oneOfType([
    PropTypes.oneOf(["start", "middle", "end"]),
    PropTypes.func
  ]),
  x: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  y: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

VictoryLabel.defaultProps = {
  direction: "inherit",
  textComponent: <Text />,
  tspanComponent: <TSpan />,
  capHeight: 0.71, // Magic number from d3.
  lineHeight: 1
};

export default VictoryLabel;
