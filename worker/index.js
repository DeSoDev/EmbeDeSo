//used for info in HTMLRewriter
const metaData = {}

async function handleRequest(req) {
    let res

    //get path
    const url = new URL(req.url);

    // replace req hostname to a node in case of running this in dev mode using `workers dev` command.
    let workerdev = false;
    if (url.hostname.match(/workers.dev$/)) {
        workerdev=true;
        url.hostname='tijn.club'
    }

    //check if env variable with api domain is set
    //this is done for situations where you are running node on separate domain from frontend
    let apiHost = url.host
    if ( typeof NODEAPI !== 'undefined' && NODEAPI !== "" ) {
        apiHost = NODEAPI
    }

    //prepare metadata
    metaData.siteUrl=`${url.protocol}//${url.host}`
    metaData.apiUrl=`${url.protocol}//${apiHost}/api/v0`
    metaData.hostname=`${url.hostname}`

    //get path accessed
    const path = url.pathname.split("/");
    path.splice(0, 1);
    let reqType = path.shift();

    //script supports oembed json discovery, but currently not much
    //benefit of this for DeSo Nodes
    const oEmbed = reqType == 'oembed';
    if (oEmbed) {
        //TODO: oembed may require `url` query string param and we should use that to parse
        reqType = path.shift();
        }
    
    //fetch the origin, or the dummy URL from worker dev 
    res = await fetch(url.toString(), req);

    //for users & posts - fetch data from the api & transform the returned html
    let content
    metaData.link = url
    metaData.path = url.pathname

    //get correct meta data for each page type
    switch (reqType) {
        case 'u':
            //this is a request for a user
            content = await getUser(path.shift())
            const price = Math.floor(content.CoinPriceDeSoNanos / 1e9)
            metaData.title = `${content.Username} (${price} $DESO)`
            metaData.username = content.Username;
            metaData.description = content.Description.trim()
            metaData.image = `${metaData.apiUrl}/get-single-profile-picture/${content.PublicKeyBase58Check}`
            break;
        case 'posts':
        case 'nft':
            //this is a request for a post or an nft
            content = await getPost(path.shift());
            const postType = content.IsNFT ? 'Nft' : 'Post';
            const firstLine = content.Body.split("\n")[0];
            metaData.title = `${postType} by @${content.ProfileEntryResponse.Username}: "${firstLine.substring(0, 45)}..."`;
            metaData.username = content.ProfileEntryResponse.Username;
            if ( content.ImageURLs && content.ImageURLs.length > 0 ) {
                metaData.image = content.ImageURLs[0];
            } else {
                metaData.image = `${metaData.apiUrl}/get-single-profile-picture/${content.ProfileEntryResponse.PublicKeyBase58Check}`;
            }
            metaData.description = content.Body.trim().substring(0, 500) + '...';
            break;
    }

    if (oEmbed || workerdev) {
        //prepare data
        const data = {
            type: 'link',
            version: '1.0',
            title: metaData.title,
            author_name: metaData.username,
            author_url: `${metaData.siteUrl}/u/${metaData.username}`,
            provider_name: 'DeSo',
            provider_url: metaData.siteUrl,
            cache_age: 3600,
            thumbnail_url: `${metaData.siteUrl}/assets/img/desologo.svg`,
            thumbnail_width: 704,
            thumbnail_height: 801
        }

        //if post with image
        if ( (reqType == 'posts' || reqType == 'nft') && content.ImageURLs && content.ImageURLs.length > 0) {
            data.type = 'photo';
            data.url = content.ImageURLs[0];
            data.width = 500;
            data.height = 300;
        }

        // if this is running on worker dev, then just add the metaData object to the json output for debugging
        if ( workerdev ) {
            data.metaData = metaData;
        }

        //return embed json response
        return new Response(JSON.stringify(data), {
            headers: {
                "content-type": "application/json;charset=UTF-8"
            }
        })
    } else {
        //return rewritten response
        return rewriter.transform(res)
    }
}

async function api(path, data) {
    const url = `${metaData.apiUrl}/${path}`
    const init = {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify(data)
    }
    const response = await fetch(url, init)
    const json = response.status == 200 ? await response.json() : { status: response.status, error: response.statusText, body: await response.text() }
    return json
}

async function getUser(id) {
    const data = await api('get-single-profile', {
        PublicKeyBase58Check: '',
        Username: id
    })
    return data.Profile
}

async function getPost(id) {
    const data = await api('get-single-post', {
        PostHashHex: id,
        ReaderPublicKeyBase58Check: "",
        AddGlobalFeedBool: false,
        FetchParents: false,
        CommentLimit: 0,
        CommentOffset: 0
    })
    return data.PostFound
}

class ElementRewriter {
    element(element) {
        switch (element.tagName) {
            case 'title':
                element.setInnerContent(metaData.title);
                break;
            case 'head':
                element.append(`<link type="application/json+oembed" href="/oembed${metaData.path}" />`, { html: true })
                break;
        }
    }
}

class MetaRewriter {
    element(element) {
        switch (element.getAttribute('name')) {
            case "description":
                //TODO: Make this substring smarter
                element.setAttribute('content', metaData.description.substring(0, 300))
                break;
        }
        switch (element.getAttribute('property')) {
            case "og:title":
                element.setAttribute('content', metaData.title)
                break;
            case "og:description":
                element.setAttribute('content', metaData.description)
                break;
            case "og:site_name":
                element.setAttribute('content', metaData.hostname)
                break;
            case "og:image":
                element.setAttribute('content', metaData.image)
                break;
        }
    }
}

const rewriter = new HTMLRewriter()
    .on("title", new ElementRewriter())
    .on("meta", new MetaRewriter())
//.on("head", new ElementRewriter()) //not use this at the moment

addEventListener("fetch", event => {
    event.respondWith(handleRequest(event.request))
})