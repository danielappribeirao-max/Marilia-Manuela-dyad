import React, { Component } from 'react';
import { DragDropContext, DragDropContextProps } from 'react-beautiful-dnd';

// Este componente de classe atua como um wrapper para o DragDropContext
// para contornar problemas de compatibilidade com React.StrictMode e React 18.
class DndWrapper extends Component<DragDropContextProps> {
  render() {
    return <DragDropContext {...this.props}>{this.props.children}</DragDropContext>;
  }
}

export default DndWrapper;