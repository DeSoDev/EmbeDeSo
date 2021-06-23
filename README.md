# EmbedClout

Easy Cloudflare Workers script that you can add to your Bitclout Node domain to enable proper dynamic title and meta tags and with that get proper URL embeds on all majopr platforms like Discord, Slack & Twitter.

## Warning

Amending the index.js script and worker settings may impact the smooth running of your bitclout node frontend. 

Therefore I recommend you test this setup first one a subdomain of your node domain.

In addition be careful committing or merging changes to the worker/index.js script.

Lastly - you can only run 1 worker with the name `embedclout` in a single cloudflare account. So if you want to apply this to multiple node domains, you just need it ones and configure the routes on each of the domains that point to the worker.


## Dependencies

This script can only be used on Cloudflare workers.

This means your bitclout node domain has to be hosted on Cloudfare, and you have to have the workers service enabled.

It also presumes the frontend and backend are both hosted on the same node.

You dont need Workers Unbound for this script. If your node gets less then 100k visits a day, you can probably run this on the FREE tier. If you have more visits, then for $5 / month your Bundled Workers plan can support upto 10m requests per month. Every additional million costs $0.50 ... just like the first Bitclout ever minted!

[More detail on pricing is here.](https://developers.cloudflare.com/workers/platform/pricing)


## Install this on your Bitclout Domain

Follow the steps below to setup this Bitclout embed script on your cloudflare workers and your bitclout domain.

### Step 1. Fork this repo

Go to the CloutEmbed github repo, and fork it.

![](./fork-repo.png)

### Step 2. Setup Your Github Secrets

Open the repo `Settings` area in a new browser tab, and then select `Secrets` in the sidebar.

As you will be skipping between this guide here, and your secrets settings its best to use a 2nd browser tab.

Add the following repo secrets -  using Step 3 and 4 below.

* `CF_ZONE_ID`: The ID of the Cloudflare zone for your bitclout domain
* `CF_ACCOUNT_ID`: Your Cloudflare Account ID
* `CF_API_TOKEN`: Create a API token

After adding the 3 secrets & the values from the previous steps, it should look like this:

![Secrets](./secrets.png)


### Step 3. Get your Account & Zone ID

* Go to your [Cloudflare Dashboard](https://dash.cloudflare.com/)
* Select the relevant account 
* Select the domain
* Scroll down in the right sidebar until you see the API section

![](./get-account-id.png)

#### Step 4. Setup your API key

I recommend you setup a dedicated Cloudflare api token to allow github to deploy the worker script to the specific zone only.

* [Go to the API Tokens section on Cloudflare](https://dash.cloudflare.com/profile/api-tokens)

* Click 'Create Token'.

* Click `Use Template` for the `Edit Cloudflare Workers` row

* Leave the permissions as is

* Under `Account resources` select the account you are deploying this worker on

* Under `Zone resources` set it to `specific zone` and select your bitclout domain in the dropdown.

* Click `continue to summary`

* Click `Create Token`

* Copy & safely store the token in your password manager


### Step 5. Deploy

To deploy the worker script to cloudflare:

* Go to the Gitup `Actions` tab for the forked repo.
* As you forked the repo, accept use of Actions
* Click the `Deploy` workflow.
* Click the `Run workflow` button on the right
* Wait for it to complete
* If everything has gone ok it should show a green checkmark besides the workflow run


### Step 6. Check the worker is setup

Go to the workers section for your account.

It should show the `embedclout` worker.

It should also have been deployed on the workers.dev route - but this wont actually do anything.

The reason for this is that the script needs to fetch the html from the node origin.

So if you acccess the worker.dev route that has been setup you will see a "workers.dev editor not supported" message.

### Step 6. Setup the worker routes for your domain

Go to  your domain dashboard on cloudflare.

Click the workers tab.

Setup the following 2 routes:

1. the user route: `example.com/u/*` and `EmbedClout` as the worker.
2. the posts route: `example.com/posts/*` and `EmbedClout` as the worker.

Of course here you use your actual domain rather then `example.com`.

### Step 7. Update your node index.html file to include some meta tags

When central bitclout adopt EmbedClout, these changes wont be needed as the meta tags will be included in [the node frontend](https://github.com/bitclout/frontend).

Until then, your node index.html file may look something like this:

```html
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="referrer" content="no-referrer" />
    <title>Welcome to TijnClout</title>      
    <base href="/" />
```

Insert the meta tags below in between the `title` and `base` tags.

```html
    <meta name="description" content="">
    <meta name="theme-color" content="#7289DA">
    <meta name="twitter:card" content="summary_large_image">
    <meta property="og:title" content="">
    <meta property="og:description" content="">
    <meta property="og:site_name" content="" >
    <meta property='og:image' content="">
```

You can add default descriptions, titles and sitenames if you want.

If you run your frontend on docker you will need to rebuild the container image, and relaunch it.


### Step 8. Test

Go to a discord channel and test a few embeds to make sure its working.

![](./discord.png)

Also browse your node with a few posts and users to make sure all is fine there too.

### Step 9. Disable the worker.dev domain

Click the `embedclout` worker link on your domain worker dashboard.

Disable the Workers.dev route as you wont need it.


## Further improvements

Here are some TODOs that you may want to work on.

* [ ] Support oembed discovery URLs - most of the code for it is there but needs to be updated to support the `url` querystring param

* [ ] Filter traffic based on useragent and only run the worker api requests for known embed sources like discord, twitter, slack and search engine spiders.

* [ ] Add caching or KV store for API responses to reduce load on API and increase speed further.

* [ ] Add build script to minifi index.js