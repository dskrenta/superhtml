import React from 'react';
import './App.css';

const API_URL = 'https://feedvix.herokuapp.com/api';

class App extends React.Component {
  state = {
    items: []
  };

  componentDidMount() {
    this.fetchContent();
  }

  async fetchContent() {
    try {
      const res = await fetch(API_URL);
      const results = await res.json();

      this.setState({ items: results });
    }
    catch (error) {
      console.error(error);
    }
  }

  renderItem(result, key) {
    if (result.type === 'img' && result.url) {
      return (
        <div key={key}>
          <hr />
          <img src={result.url} className="img"></img>
          <a href={result.url} target="_blank" style={{textDecoration: 'none', color: 'inherit'}}>
            <figcaption className="figure-caption">{result.source}</figcaption>
          </a>
          <hr />
        </div>
      );
    }
    else if (result.type === 'num') {
      return ( <h3 key={key} className="item">{result.num}</h3> );
    }
    else if (result.type === 'text') {
      return ( <h3 key={key} className="item">{result.text}</h3> );
    }
    else if (result.type === 'article') {
      return (
        <div key={key} className="media item">
          <div className="media-body">
            <a href={result.url} target="_blank" style={{textDecoration: 'none', color: 'inherit'}}>
              <h5 className="mt-0">{result.title}</h5>
            </a>
            <small className="text-muted">{result.source.name} - {result.createdAt}</small>
            {result.content && <p>{result.content}</p>}
          </div>
          <img src={result.image} className="align-self-start mr-3"  width="200px" alt="..." />
        </div>
      );
    }
    else if (result.type === 'trivia' && (result.question && result.answer)) {
      return (
        <blockquote key={key} className="blockquote item">
          <p className="mb-0">{result.question}</p>
          <footer className="blockquote-footer">{result.answer}</footer>
          {result.value && <p className="text-muted">{result.value}</p>}
        </blockquote>
      );
    }
    else if (result.type === 'quote') {
      return (
        <blockquote key={key} className="blockquote item">
          <p className="mb-0">{result.content}</p>
          <footer className="blockquote-footer">{result.author}</footer>
        </blockquote>
      );
    }
    else if (result.type === 'wiki') {
      return (
        <div key={key} className="media item wiki">
          <div className="media-body">
            <a href={result.url} target="_blank" style={{textDecoration: 'none', color: 'inherit'}}>
              <h5 className="mt-0">{result.title}</h5>
            </a>
            {result.content && <p>{result.content}</p>}
            <figcaption className="figure-caption">Wikipedia</figcaption>
          </div>
          {result.image && <img src={result.image} className="align-self-start mr-3"  width="200px" alt={result.title} />}
        </div>
      );
    }
    else if (result.type === 'joke' && result.content) {
      return (
        <blockquote key={key} className="blockquote joke item">
          {result.content}
        </blockquote>
      );
    }
  }

  render() {
    return (
      <div className="container">
        <h1>
          Feed<span style={{color: 'red'}}>vix</span>
          <small className="text-muted">(David's Feed)</small>
        </h1>
        <hr />
        <div id="loading">
          <h5>Loading...</h5>
          <div className="vix">
            <div className="spine"></div>
            <div className="topJaw">
              <div className="eye1"></div>
              <div className="eye2"></div>
              <div className="ttooth1"></div>
              <div className="ttooth2"></div>
            </div>
            <div className="bottomJaw">
              <div className="btooth1"></div>
              <div className="btooth2"></div>
            </div>
            <div className="leftArm"></div>
            <div className="rightArm"></div>
            <div className="leftLeg"></div>
            <div className="rightLeg"></div>
            <div className="ball ball1"></div>
            <div className="ball ball2"></div>
            <div className="ball ball3"></div>
            <div className="ball ball4"></div>
          </div>
          <h6>Don't forget to Feed <span style={{color: 'red'}}>Vix!</span></h6>
        </div>
        <div>{this.state.items.map((item, index) => this.renderItem(item, index))}</div>
      </div>
    );
  }
}

export default App;
