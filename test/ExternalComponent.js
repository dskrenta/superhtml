'use strict';

const ExternalComponent = (state) => {
  return render`
    <div>{state.name}</div>
  `;
}