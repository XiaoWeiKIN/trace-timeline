// 列宽分隔条（FR-9）——移植自 grafana TimelineColumnResizer（Apache/Uber）。
// 覆盖整个表头全宽，拖拽分隔条改名称列占比；class + DraggableManager（AD-3）；配色走 theme。
import { css } from '@emotion/css';
import { PureComponent, type CSSProperties } from 'react';

import type { TNil } from '../core';
import { useStyles2, type Theme } from '../theme';
import { DraggableManager, type DraggableBounds, type DraggingUpdate } from '../utils';

const getStyles = (theme: Theme) => {
  const accent = theme.colors.primary.main;
  const grip = theme.colors.border.strong;
  return {
    root: css({ label: 'DdColumnResizer', left: 0, position: 'absolute', right: 0, top: 0 }),
    dragger: css({
      label: 'DdColumnResizerDragger',
      borderLeft: '2px solid transparent',
      cursor: 'col-resize',
      marginLeft: -1,
      position: 'absolute',
      top: 0,
      width: 1,
      zIndex: 10,
      '&:hover': { borderLeft: `2px solid ${accent}` },
      '&::before': { position: 'absolute', top: 0, bottom: 0, left: -8, right: 0, content: '" "' },
    }),
    draggerDragging: css({
      label: 'DdColumnResizerDragging',
      background: 'rgba(110, 159, 255, 0.08)',
      width: 'unset',
      '&::before': { left: -2000, right: -2000 },
    }),
    draggerDraggingLeft: css({ label: 'DdColumnResizerLeft', borderLeft: `2px solid ${accent}`, borderRight: `1px solid ${grip}` }),
    draggerDraggingRight: css({ label: 'DdColumnResizerRight', borderLeft: `1px solid ${grip}`, borderRight: `2px solid ${accent}` }),
    gripIcon: css({
      label: 'DdColumnResizerGrip',
      position: 'absolute',
      top: 0,
      bottom: 0,
      '&::before, &::after': {
        borderRight: `1px solid ${grip}`,
        content: '" "',
        height: 9,
        position: 'absolute',
        right: 9,
        top: 9,
      },
      '&::after': { right: 5 },
    }),
    gripIconDragging: css({ label: 'DdColumnResizerGripDragging', '&::before, &::after': { borderRight: `1px solid ${accent}` } }),
  };
};

type Styles = ReturnType<typeof getStyles>;

export type DdColumnResizerProps = {
  min: number;
  max: number;
  onChange: (newSize: number) => void;
  position: number;
  columnResizeHandleHeight: number;
};

type State = { dragPosition: number | TNil };

class ColumnResizerInner extends PureComponent<DdColumnResizerProps & { styles: Styles }, State> {
  _dragManager: DraggableManager;
  _rootElm: Element | TNil;

  constructor(props: DdColumnResizerProps & { styles: Styles }) {
    super(props);
    this._dragManager = new DraggableManager({
      getBounds: this._getDraggingBounds,
      onDragEnd: this._handleDragEnd,
      onDragMove: this._handleDragUpdate,
      onDragStart: this._handleDragUpdate,
    });
    this._rootElm = undefined;
    this.state = { dragPosition: null };
  }

  componentWillUnmount() {
    this._dragManager.dispose();
  }

  _setRootElm = (elm: Element | TNil) => {
    this._rootElm = elm;
  };

  _getDraggingBounds = (): DraggableBounds => {
    if (!this._rootElm) {
      throw new Error('invalid state');
    }
    const { left: clientXLeft, width } = this._rootElm.getBoundingClientRect();
    const { min, max } = this.props;
    return { clientXLeft, width, maxValue: max, minValue: min };
  };

  _handleDragUpdate = ({ value }: DraggingUpdate) => {
    this.setState({ dragPosition: value });
  };

  _handleDragEnd = ({ manager, value }: DraggingUpdate) => {
    manager.resetBounds();
    this.setState({ dragPosition: null });
    this.props.onChange(value);
  };

  render() {
    const { styles, position, columnResizeHandleHeight } = this.props;
    const { dragPosition } = this.state;
    const left = `${position * 100}%`;
    const gripStyle: CSSProperties = { left };
    let isDraggingLeft = false;
    let isDraggingRight = false;
    let draggerStyle: CSSProperties;

    if (this._dragManager.isDragging() && this._rootElm && dragPosition != null) {
      isDraggingLeft = dragPosition < position;
      isDraggingRight = dragPosition > position;
      const draggerLeft = `${Math.min(position, dragPosition) * 100}%`;
      const draggerRight = `calc(${(1 - Math.max(position, dragPosition)) * 100}% - 1px)`;
      draggerStyle = { left: draggerLeft, right: draggerRight };
    } else {
      draggerStyle = { ...gripStyle };
    }
    draggerStyle.height = columnResizeHandleHeight;

    const isDragging = isDraggingLeft || isDraggingRight;
    const draggerCls = [
      styles.dragger,
      isDragging ? styles.draggerDragging : '',
      isDraggingRight ? styles.draggerDraggingRight : '',
      isDraggingLeft ? styles.draggerDraggingLeft : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={styles.root} ref={this._setRootElm} data-testid="DdColumnResizer">
        <div
          className={`${styles.gripIcon}${isDragging ? ` ${styles.gripIconDragging}` : ''}`}
          style={gripStyle}
          data-testid="DdColumnResizer--gripIcon"
        />
        <div
          aria-hidden
          className={draggerCls}
          onMouseDown={this._dragManager.handleMouseDown}
          style={draggerStyle}
          data-testid="DdColumnResizer--dragger"
        />
      </div>
    );
  }
}

/** 函数包装——用 hook 取主题样式后注入内层 class。 */
export function DdColumnResizer(props: DdColumnResizerProps) {
  const styles = useStyles2(getStyles);
  return <ColumnResizerInner {...props} styles={styles} />;
}
