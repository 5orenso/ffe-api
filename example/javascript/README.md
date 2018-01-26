# FFE API Examples - Clientside Javascript

Flyfish Europe REST API client side examples.

## Files

- [Example HTML file](html-client.html)

```html
<script type="text/javascript">
    FFE_TOKEN = '<your clientside jwtToken for the dealerweb>';
</script>
<script type="text/javascript" src="https://rawgit.com/5orenso/ffe-api/master/sdk/javascript/ffe-api-sdk.js"></script>
```


## Howto test Client side javascript

Mac OS X:
```
# Go to the directory with your html test file:
$ cd <to the directory with the html file>

# Start a simple http server built in on your Mac:
$ python -m SimpleHTTPServer 9999

# Start a browser and load the file from the server:
$ open http://localhost:9999/html-client.html
# A browser should now open and display the html page.
```
