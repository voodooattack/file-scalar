/**
 * Stolen from vulcan:forms. Modified to work with GraphQL `File` scalars.
 */

import { Components, getSetting, registerComponent } from 'meteor/vulcan:lib';
import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
import 'isomorphic-fetch'; // patch for browser which don't have fetch implemented

/*
Get a URL from an image or an array of images
*/
const getImageUrl = imageOrImageArray => {
  // if image is actually an array of formats, use first format
  const image = Array.isArray(imageOrImageArray) ? imageOrImageArray[0] : imageOrImageArray;
  // if image is an object, return secure_url; else return image itself
  return typeof image === 'string' ? image : image.url;
};

/*
Remove the nth item from an array
*/
const removeNthItem = (array, n) => [..._.first(array, n), ..._.rest(array, n+1)];

/*
Display a single image
*/
class Image extends PureComponent {

  constructor() {
    super();
    this.clearImage = this.clearImage.bind(this);
  }

  clearImage(e) {
    e.preventDefault();
    this.props.clearImage(this.props.index);
  }

  render() {
    return (
      <div>
        <a href="javascript:void(0)" onClick={this.clearImage}><Components.Icon name="close"/> Remove image</a>
        <img style={{height: 120}} src={getImageUrl(this.props.image)} />
      </div>
    )
  }
}

/*
Image Upload component
*/
class Upload extends PureComponent {

  constructor(props, context) {
    super(props, context);

    this.onDrop = this.onDrop.bind(this);
    this.clearImage = this.clearImage.bind(this);
    this.enableMultiple = this.enableMultiple.bind(this);

    const { previewUrl = () => '' } = props.options || {};
    const preview = previewUrl(props.document);
    const isEmpty = this.enableMultiple() ? props.value.length === 0 : !props.value && !preview;
    const emptyValue = this.enableMultiple() ? [] : '';

    this.state = {
      preview,
      uploading: false,
      value: isEmpty ? emptyValue : props.value,
    };

  }

  /*
  Add to autofilled values so SmartForms doesn't think the field is empty
  if the user submits the form without changing it
  */
  componentWillMount() {
    const isEmpty = this.enableMultiple() ? this.props.value.length === 0 : !this.props.value;
    const emptyValue = this.enableMultiple() ? [] : '';
    this.context.addToAutofilledValues({[this.props.name]: isEmpty ? emptyValue : this.props.value});
  }

  /*
  Check the field's type to decide if the component should handle
  multiple image uploads or not
  */
  enableMultiple() {
    return this.props.datatype.definitions[0].type === Array;
  }

  /*
  When an image is uploaded
  */
  onDrop(files) {

    // set the component in upload mode with the preview
    this.setState({
      preview: this.enableMultiple() ? [...this.state.preview, files[0].preview] : files[0].preview
    });

    // tell vulcanForm to catch the value
    this.context.addToAutofilledValues({[this.props.name]: files[0]});
  }

  /*
  Remove the image at `index` (or just remove image if no index is passed)
  */
  clearImage(index) {
    window.URL.revokeObjectURL(this.enableMultiple() ? this.state.value[index].preview : this.state.preview);
    const newValue = this.enableMultiple() ? removeNthItem(this.state.value, index): '';
    this.context.addToAutofilledValues({[this.props.name]: newValue});
    this.setState({
      preview: newValue,
      value: newValue,
    });
  }

  render() {
    const { uploading, preview, value } = this.state;
    // show the actual uploaded image or the preview
    const imageData = preview || value;
    return (
      <div className="form-group row">
        <label className="control-label col-sm-3">{this.props.label}</label>
        <div className="col-sm-9">
          <div className="upload-field">
            <Dropzone ref="dropzone"
                      multiple={this.enableMultiple()}
                      onDrop={this.onDrop}
                      accept="image/*"
                      className="dropzone-base"
                      activeClassName="dropzone-active"
                      rejectClassName="dropzone-reject"
            >
              <div>Drop an image here, or click to select an image to upload.</div>
            </Dropzone>

            {imageData ?
              <div className="upload-state">
                {uploading ? <span>Uploading…</span> : null}
                <div className="images">
                  {this.enableMultiple() ?
                    imageData.map((image, index) => <Image clearImage={this.clearImage} key={index} index={index} image={image}/>) :
                    <Image clearImage={this.clearImage} image={imageData}/>
                  }
                </div>
              </div>
              : null}
          </div>
        </div>
      </div>
    );
  }
}

Upload.propTypes = {
  name: PropTypes.string,
  value: PropTypes.any,
  label: PropTypes.string
};

Upload.contextTypes = {
  addToAutofilledValues: PropTypes.func,
  getDocument: PropTypes.func
};

registerComponent('Upload', Upload);

export { Upload };